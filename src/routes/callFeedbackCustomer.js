const callFeedback = require('@/services/callFeedback');
const logger = require('@/services/logger')(module);

async function callFeedbackCustomer(req, res) {
  const { callId, ...feedback } = req.body;
  const consistencyErrors = callFeedback.checkCustomerFeedbackConsistency(callId, feedback);

  if (consistencyErrors.length) {
    logger.error('customer.feedback.inconsistent', consistencyErrors);
    res.status(400).send({ errors: consistencyErrors });
    return;
  }

  const isExist = await callFeedback.checkCallExistence(callId);

  if (!isExist) {
    logger.error('customer.feedback.call.not.exists', callId, feedback);
    res.status(404).send();
    return;
  }

  try {
    await callFeedback.saveCustomerFeedback(callId, feedback);
    logger.info('customer.feedback.saved', callId, feedback);
    res.send('success');
  } catch (error) {
    logger.error('customer.feedback.not.saved', callId, feedback);
    res.status(500).send({ errors: [error] });
  }
}

module.exports = callFeedbackCustomer;
