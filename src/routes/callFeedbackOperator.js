const callFeedback = require('@/services/callFeedback');
const logger = require('@/services/logger')(module);
const { CallUpdateError } = require('@/services/errors');

async function callFeedbackOperator(req, res) {
  const { callId, ...feedback } = req.body;
  const consistencyErrors = callFeedback.checkOperatorFeedbackConsistency(callId, feedback);

  if (consistencyErrors.length) {
    logger.error('operator.feedback.inconsistent', consistencyErrors);
    res.status(400).send({ messages: consistencyErrors });
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
    if (error instanceof CallUpdateError) {
      logger.error('operator.feedback.not.saved', callId, feedback, error.messages);
      res.status(400).send({ messages: error.messages });
    } else {
      logger.error('operator.feedback.not.saved', callId, feedback, error.message);
      res.status(500).send({ messages: [error.message] });
    }
  }
}

module.exports = callFeedbackOperator;
