/**
 * https://docs.github.com/en/developers/webhooks-and-events/events/github-event-types
 * @type {string[]}
 */
const parsableEvents = [
  'CreateEvent',
  'ForkEvent',
  'MemberEvent',
  'PublicEvent',
  'PushEvent',
  'ReleaseEvent',
  'WatchEvent',
];

const activityParser = (event) => {
  const parsable = parsableEvents.includes(event.type);

  if (parsable) {
    const {
      id,
      type,
      actor,
      repo,
      payload,
      created_at,
    } = event;

    return {
      id,
      type,
      actor,
      repo,
      payload,
      created_at,
    };
  }

  return null;
};

export {
  parsableEvents,
  activityParser,
};
