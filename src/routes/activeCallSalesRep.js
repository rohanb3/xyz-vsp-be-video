const calls = require('@/services/calls/calls');
const callSalesRepDTO = require('@/models/dto/call/callSalesRepDTO');

async function getActiveCallSalesRep(req, res) {
  const { operatorId } = req.params;

  return calls
    .getActiveCall(operatorId)
    .then(call => {
      return res.status(200).send(callSalesRepDTO(call));
    })
    .catch(() => res.sendStatus(404));
}

exports.getActiveCallSalesRep = getActiveCallSalesRep;
