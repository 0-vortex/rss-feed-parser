import { Octokit } from 'octokit';
import { hero, header, log, warning, error } from './lib/logger.js';

const lastExecuted = new Date();

// introduction block
hero('0-vortex|RSS Feed');
log(`Started execution at ${lastExecuted}`)

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// user block
header('Parsing logged user');

const {
  data: user,
} = await octokit.rest.users.getAuthenticated();
warning('%O', user);

// follow block
header('Parsing following users');

const users = await octokit.paginate(
  octokit.rest.users.listFollowedByAuthenticatedUser,
  {
    per_page: 100,
  },
  (response) => response.data,
);
error('Fetched %d users', users.length);


// cache block
