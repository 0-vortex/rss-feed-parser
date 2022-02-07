import { Octokit } from 'octokit';
import { p } from '@antfu/utils';
import {
  hero, header, log, warning, error,
} from './lib/logger.js';
import cron from './cron.json';
import { activityParser } from './lib/activity.js';
import { supabase } from './lib/supabase.js';

const offsetHours = parseInt(process.env.OFFSET_HOURS, 10) || 4;
const offsetUsers = parseInt(process.env.OFFSET_USERS, 10) || 50;
const checked = { ...cron.checked };
const lastExecuted = new Date();
const parsedCache = {};
const parseUsers = [];
const parseEvents = [];

// introduction block
hero('0-vortex|RSS Feed');
log(`Started execution at ${lastExecuted}`);

Object.entries(checked).forEach((item) => {
  const date = new Date(checked[item].lastExecuted);
  const diff = lastExecuted - date;

  // generate a cache of items with offset dates
  parsedCache[item] = {
    ...checked[item],
    offsetHours: Number(diff / 1000 / 60 / 60).toFixed(0),
  };
});

const run = async () => {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  // user block
  header('Parsing logged user');

  const {
    data: runner,
  } = await octokit.rest.users.getAuthenticated();
  warning('%O', runner);

  // follow block
  header('Parsing following users');

  const users = await octokit.paginate(
    octokit.rest.users.listFollowedByAuthenticatedUser,
    {
      per_page: 100,
    },
    // implement cache here in pagination to avoid hitting the API
    (response) => response.data,
  );
  warning('Fetched %d users', users.length);

  // cache block
  for (const user of users) {
    if (typeof parsedCache[user.login] === 'undefined') {
      warning(`${user.login} is not in our cache, adding to the queue`);
      parseUsers.push(user);
    } else {
      // we have a local cache of this installation
      let parsed = false;

      if (
        parsedCache[user.login].offsetHours >= offsetHours
      ) {
        parseUsers.push(user);
        parsed = true;
      }

      const fn = parsed ? warning : log;

      fn(`${user.login} has been checked ${
        parsedCache[user.login].offsetHours} hours ago, ${parsed ? 'adding to the queue' : 'skipping'}`);
    }

    if (parseUsers.length >= offsetUsers) {
      error('Queue is full, stop adding users to the stack');
      break;
    }
  }

  header('Parsing users');
  log(`Existing user queue was ${parseUsers.length}`);
  for await (const user of parseUsers) {
    log(`Fetching events for user ${user.login}`);

    const events = await octokit.rest.activity.listPublicEventsForUser({
      username: user.login,
    });

    const insertEvents = await p(events.data)
      .map((event) => {
        const filtered = activityParser(event);
        if (filtered !== null) {
          console.log(filtered);
          parseEvents.push(filtered);
        }
      });
    warning('Fetched %d events, pushing to queue', insertEvents.length);
  }

  log('Insert %d events', parseEvents.length);
  const {error: err, data} = await supabase
    .from('events')
    .upsert(parseEvents, {
      // returning: "minimal",
      count: "exact",
      onConflict: "id",
      ignoreDuplicates: true,
    });

  // log(err);
  warning('Inserted %d new events', data.length);

};

await run();
