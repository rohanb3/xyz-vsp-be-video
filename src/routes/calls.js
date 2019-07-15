// const { check } = require('express-validator/check');

const calls = require('@/services/calls/calls');

async function getCalls(req, res) {
  const { ...query } = req.query;
  const list = await calls.getCallsLazy(query);
  res.status(200).send(list);
}

//TODO uncomment after connect to retailers
function getCallsValidationArray() {
  return [
    // check('retailerId')
    //   .exists()
    //   .withMessage('retailerId is required'),
  ];
}

exports.getCalls = getCalls;
exports.getCallsValidationArray = getCallsValidationArray;
