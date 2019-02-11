const callFeedback = require('@/services/callFeedback');
const logger = require('@/services/logger')(module);

async function callFeedbackOperator(req, res) {
  const { callId, ...feedback } = req.body;
  const consistencyErrors = callFeedback.checkOperatorFeedbackConsistency(callId, feedback);

  if (consistencyErrors.length) {
    logger.error('operator.feedback.inconsistent', consistencyErrors);
    res.status(400).send({ errors: consistencyErrors });
    return;
  }

  const isExist = await callFeedback.checkCallExistence(callId);

  if (!isExist) {
    logger.error('operator.feedback.call.not.exists', callId, feedback);
    res.status(404).send();
    return;
  }

  try {
    await callFeedback.saveOperatorFeedback(callId, feedback);
    logger.info('operator.feedback.saved', callId, feedback);
    res.send('success');
  } catch (error) {
    logger.error('operator.feedback.not.saved', callId, feedback);
    res.status(500).send({ errors: [error] });
  }
}

module.exports = callFeedbackOperator;
