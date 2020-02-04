'use strict';
const moment = require('moment');
const Call = require('../src/models/call');

const { CALL_ANSWERED, CALL_MISSED } = require('../src/constants/calls');

const calculateDuration = (end, start) =>
  end && start && moment.duration(moment(end).diff(moment(start))).asSeconds();
const getCallResultStatus = (requestedAt, finishedAt) =>
  requestedAt && (finishedAt ? CALL_ANSWERED : CALL_MISSED);

module.exports.up = function() {
  return Call.find({
    $or: [
      { waitingDuration: { $exists: false } },
      { callDuration: { $exists: false } },
      { callResultType: { $exists: false } },
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
                waitingDuration: calculateDuration(
                  acceptedAt || missedAt,
                  requestedAt
                ),
                callResultType: getCallResultStatus(requestedAt, finishedAt),
                callDuration: calculateDuration(finishedAt, acceptedAt),
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
                callResultType: '',
                waitingDuration: '',
              },
            },
          },
        }))
      )
  );
};
