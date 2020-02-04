'use strict';
const Call = require('../src/models/call');
const { getDifferenceFromTo } = require('../src/services/time');
const { CALL_ANSWERED, CALL_MISSED } = require('../src/constants/calls');

const getCallResultStatus = (requestedAt, finishedAt) =>
  requestedAt && (finishedAt ? CALL_ANSWERED : CALL_MISSED);

module.exports.up = function() {
  return Call.find({
    $or: [
      { waitingDuration: { $exists: false } },
      { callDuration: { $exists: false } },
      { callStatus: { $exists: false } },
    ],
  }).then(
    calls =>
      calls.length &&
      Call.collection.bulkWrite(
        calls.map(({ _id, acceptedAt, requestedAt, missedAt, finishedAt }) => ({
          updateOne: {
            filter: { _id },
            update: {
              $set: {
                waitingDuration: getDifferenceFromTo(
                  acceptedAt || missedAt,
                  requestedAt
                ),
                callStatus: getCallResultStatus(requestedAt, finishedAt),
                callDuration: getDifferenceFromTo(finishedAt, acceptedAt),
              },
            },
          },
        }))
      )
  );
};

module.exports.down = function() {
  return Call.find().then(
    calls =>
      calls.length &&
      Call.collection.bulkWrite(
        calls.map(call => ({
          updateOne: {
            filter: { _id: call._id },
            update: {
              $unset: {
                callDuration: '',
                callStatus: '',
                waitingDuration: '',
              },
            },
          },
        }))
      )
  );
};
