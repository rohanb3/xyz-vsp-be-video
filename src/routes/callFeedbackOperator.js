const callFeedback = require('@/services/calls/feedback');
const { CallUpdateError } = require('@/services/calls/errors');
const { CALL_ID_MISSING, FEEDBACK_MISSING } = require('@/constants/feedbackErrors');
const logger = require('@/services/logger')(module);

function callFeedbackOperator(req, res) {
  const { callId, ...feedback } = req.body;

  const consistencyErrors = [];

  if (!callId) {
    consistencyErrors.push(CALL_ID_MISSING);
  }

  if (!Object.keys(feedback).length) {
    consistencyErrors.push(FEEDBACK_MISSING);
  }

  if (consistencyErrors.length) {
    logger.error('operator.feedback.inconsistent', consistencyErrors);
    res.status(400).send({ messages: consistencyErrors });
    return Promise.resolve();
  }

  const { OPERATOR_FEEDBACK } = callFeedback.feedbackTypes;

  return callFeedback.validateAndSaveFeedback(callId, feedback, OPERATOR_FEEDBACK)
    .then(() => {
      logger.info('operator.feedback.saved', callId, feedback);
      res.send('success');
    })
    .catch((error) => {
      if (error instanceof CallUpdateError) {
        logger.error('operator.feedback.not.saved', callId, feedback, error.messages);
        res.status(400).send({ messages: error.messages });
      } else {
        logger.error('operator.feedback.not.saved', callId, feedback, error.message);
        res.status(500).send({ messages: [error.message] });
      }
    });
}

module.exports = callFeedbackOperator;
