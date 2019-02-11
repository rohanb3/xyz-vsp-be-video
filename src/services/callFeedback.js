/* eslint-disable no-use-before-define */

const callsDBClient = require('@/services/callsDBClient');
const {
  CALL_ID_MISSING,
  FEEDBACK_MISSING,
  CUSTOMER_ID_MISSING,
  OPERATOR_ID_MISSING,
  EXPERIENCE_RATE_MISSING,
  QUALITY_MISSING,
} = require('@/constants/feedbackErrors');

function saveCustomerFeedback(callId, feedback) {
  const consistencyErrors = checkCustomerFeedbackConsistency(callId, feedback);
  if (consistencyErrors.length) {
    return Promise.reject(consistencyErrors);
  }
  return callsDBClient.updateById(callId, { customerFeedback: feedback });
}

function saveOperatorFeedback(callId, feedback) {
  const consistencyErrors = checkOperatorFeedbackConsistency(callId, feedback);
  if (consistencyErrors.length) {
    return Promise.reject(consistencyErrors);
  }
  return callsDBClient.updateById(callId, { operatorFeedback: feedback });
}

function checkCustomerFeedbackConsistency(callId, feedback) {
  const errors = checkBaseFeedbackConsistency(callId, feedback);

  if (!feedback.customerId) {
    errors.push(CUSTOMER_ID_MISSING);
  }

  return errors;
}

function checkOperatorFeedbackConsistency(callId, feedback) {
  const errors = checkBaseFeedbackConsistency(callId, feedback);

  if (!feedback.operatorId) {
    errors.push(OPERATOR_ID_MISSING);
  }

  return errors;
}

function checkBaseFeedbackConsistency(callId, feedback) {
  const errors = [];

  if (!callId) {
    errors.push(CALL_ID_MISSING);
  }

  if (!feedback) {
    errors.push(FEEDBACK_MISSING);
    return errors;
  }

  if (!feedback.experienceRate) {
    errors.push(EXPERIENCE_RATE_MISSING);
  }

  if (!feedback.quality) {
    errors.push(QUALITY_MISSING);
  }

  return errors;
}

exports.saveCustomerFeedback = saveCustomerFeedback;
exports.saveOperatorFeedback = saveOperatorFeedback;
