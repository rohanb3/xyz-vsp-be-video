const callsDBClient = require('@/services/calls/DBClient');
const { formattedTimestamp } = require('@/services/time');

function markCallAsFinished(callId, finishedBy) {
  const updates = {
    finishedAt: formattedTimestamp(),
    finishedBy,
  };

  return callsDBClient.updateById(callId, updates);
}

exports.markCallAsFinished = markCallAsFinished;
