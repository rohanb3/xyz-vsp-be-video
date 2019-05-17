const { check } = require('express-validator/check');

const calls = require('@/services/calls/calls');
const callSalesRepDTO = require('@/models/dto/call/callSalesRepDTO');

async function getActiveCallSalesRep(req, res) {
  const { operatorId } = req.query;

  return calls
    .getActiveCall(operatorId)
    .then(call => {
      return res.status(200).send(callSalesRepDTO(call));
    })
    .catch(() => res.sendStatus(404));
}

function getActiveCallSalesRepValidationArray() {
  return [
    check('operatorId')
      .exists()
      .withMessage('operatorId is required'),
  ];
}

exports.getActiveCallSalesRep = getActiveCallSalesRep;
exports.getActiveCallSalesRepValidationArray = getActiveCallSalesRepValidationArray;
