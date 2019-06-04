const calls = require('@/services/calls/calls');

async function getActiveCallSalesRep(req, res) {
  const { operatorId } = req.params;

  return calls
    .getActiveCall(operatorId)
    .then(call => (call ? res.status(200).send(call) : Promise.reject()))
    .catch(() => res.sendStatus(404));
}

exports.getActiveCallSalesRep = getActiveCallSalesRep;
