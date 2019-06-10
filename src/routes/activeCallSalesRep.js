const calls = require('@/services/calls/calls');
const logger = require('@/services/logger')(module);

async function getActiveCallSalesRep(req, res) {
  const { operatorId } = req.params;

  logger.info('Request for operator active call: ', operatorId);

  return calls
    .getActiveCall(operatorId)
    .then(call => {
      logger.info('Operator active call: ', call);
      return call ? res.status(200).send(call) : Promise.reject();
    })
    .catch(err => {
      logger.error('Request for operator active call failed: ', err);
      return res.sendStatus(404);
    });
}

exports.getActiveCallSalesRep = getActiveCallSalesRep;
