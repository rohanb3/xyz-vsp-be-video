const callFeedback = require('@/services/callFeedback');
const logger = require('@/services/logger')(module);

function callFeedbackMobile(req, res) {
  const { callId, ...feedback } = req.body;

  logger.info(callId, feedback);

  return callFeedback.saveCustomerFeedback(callId, feedback)
    .then(() => {
      logger.info('customer.feedback.saved', callId, feedback);
      res.send('success');
    })
    .catch((errors) => {
      logger.error('customer.feedback.error', errors);
      res.send(400, { errors });
    });
}

module.exports = callFeedbackMobile;
