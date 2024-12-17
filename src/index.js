import { Octokit } from 'octokit';
import { p } from '@antfu/utils';
import { writeFile } from 'node:fs/promises';
import {
  hero, header, log, warning, error,
} from './lib/logger.js';
import cron from './cron.json' with { type: 'json' };
import { activityParser } from './lib/activity.js';
import { supabase } from './lib/supabase.js';

const offsetHours = parseInt(process.env.OFFSET_HOURS, 10) || 4;
const offsetUsers = parseInt(process.env.OFFSET_USERS, 10) || 50;
const checked = { ...cron.checked };
const currentExecution = {
  lastExecuted: new Date(),
  events: 0,
  users: 0,
  repos: 0,
};
const parsedCache = {};
const parseUsers = [];
const insertEvents = [];
let insertUsers = {};
let insertRepos = {};

// introduction block
hero('0-vortex|RSS Feed');
log(`Started execution at ${currentExecution.lastExecuted}`);

Object.keys(checked).forEach((item) => {
  const date = new Date(checked[item].lastExecuted);
  const diff = currentExecution.lastExecuted - date;

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

    const prevLength = insertEvents.length;
    await p(events.data)
      .map((event) => {
        const filtered = activityParser(event);
        if (filtered !== null) {
          insertEvents.push(filtered);
          insertUsers[filtered.actor.id] = filtered.actor;
          insertRepos[filtered.repo.id] = filtered.repo;
          return filtered;
        }

        return false;
      });

    warning('Fetched %d events, pushing to queue', insertEvents.length - prevLength);
  }

  // don't ask why this is synchronous
  header('Pushing data');

  // events insert block
  await (async () => {
    log('Attempt to insert %d events', insertEvents.length);
    const { error: err, count } = await supabase
      .from('events')
      .upsert(insertEvents, {
        // returning: "minimal",
        count: 'exact',
        onConflict: 'id',
        ignoreDuplicates: true,
      });

    if (err) {
      error('Error inserting events: %O', err);
    } else {
      warning('Inserted %d new events', count);
      currentExecution.events = count;
    }
  })();

  // users insert block
  await (async () => {
    insertUsers = Object.keys(insertUsers).map((k) => insertUsers[k]);
    log('Attempt to insert %d users', insertUsers.length);
    const { error: err, data, count } = await supabase
      .from('users')
      .upsert(insertUsers, {
        // returning: "minimal",
        count: 'exact',
        onConflict: 'id',
        ignoreDuplicates: true,
      });

    if (err) {
      error('Error inserting users: %O', err);
    } else {
      warning('Inserted %d new users', count);

      insertUsers.forEach((user) => {
        checked[user.login] = {
          owner: user.login,
          lastExecuted: currentExecution.lastExecuted,
        };
      });

      currentExecution.users = count;
    }
  })();

  // repos insert block
  await (async () => {
    insertRepos = Object.keys(insertRepos).map((k) => insertRepos[k]);
    log('Attempt to insert %d repos', insertRepos.length);
    const { error: err, count } = await supabase
      .from('repos')
      .upsert(insertRepos, {
        // returning: "minimal",
        count: 'exact',
        onConflict: 'id',
        ignoreDuplicates: true,
      });

    if (err) {
      error('Error inserting repos: %O', err);
    } else {
      warning('Inserted %d new repos', count);
      currentExecution.repos = count;
    }
  })();

  // check whether we have new data to cache
  header('Versioning changes');

  // write to file and commit block
  await writeFile('./src/cron.json', JSON.stringify({
    lastExecution: currentExecution,
    checked,
  }, null, 2));
  warning('Wrote changes to cron.json, make sure to commit this file');

  header('Finished');
};

await run();
