// const { check } = require('express-validator/check');

const calls = require('@/services/calls/calls');

async function getCalls(req, res) {
  const { retailerId, from, to, offset, limit } = req.query;
  const list = await calls.getCalls(
    { retailerId },
    { from, to },
    offset,
    limit
  );
  res.status(200).send(list);
}

//TODO remove after connect to retailers
function getCallsValidationArray() {
  return [
    // check('retailerId')
    //   .exists()
    //   .withMessage('retailerId is required'),
  ];
}

exports.getCalls = getCalls;
exports.getCallsValidationArray = getCallsValidationArray;
