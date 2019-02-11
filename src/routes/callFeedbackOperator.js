const callFeedback = require('@/services/callFeedback');
const logger = require('@/services/logger')(module);

function callFeedbackOperator(req, res) {
  const { callId, ...feedback } = req.body;

  logger.info(callId, feedback);

  return callFeedback.saveOperatorFeedback(callId, feedback)
    .then(() => {
      logger.info('operator.feedback.saved', callId, feedback);
      res.send('success');
    })
    .catch((errors) => {
      logger.error('operator.feedback.error', errors);
      res.send(400, { errors });
    });
}

module.exports = callFeedbackOperator;
