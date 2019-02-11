/* eslint-disable no-use-before-define */

const callsDBClient = require('@/services/callsDBClient');
const {
  CALL_ID_MISSING,
  CUSTOMER_ID_MISSING,
  OPERATOR_ID_MISSING,
  EXPERIENCE_RATE_MISSING,
  QUALITY_MISSING,
} = require('@/constants/feedbackErrors');

function saveCustomerFeedback(callId, feedback = {}) {
  return callsDBClient.updateById(callId, { customerFeedback: feedback });
}

function saveOperatorFeedback(callId, feedback = {}) {
  return callsDBClient.updateById(callId, { operatorFeedback: feedback });
}

function checkCallExistence(callId) {
  return callsDBClient.getById(callId)
    .then(Boolean);
}

function checkCustomerFeedbackConsistency(callId, feedback = {}) {
  const errors = checkBaseFeedbackConsistency(callId, feedback);

  if (!feedback.customerId) {
    errors.push(CUSTOMER_ID_MISSING);
  }

  return errors;
}

function checkOperatorFeedbackConsistency(callId, feedback = {}) {
  const errors = checkBaseFeedbackConsistency(callId, feedback);

  if (!feedback.operatorId) {
    errors.push(OPERATOR_ID_MISSING);
  }

  return errors;
}

function checkBaseFeedbackConsistency(callId, feedback = {}) {
  const errors = [];

  if (!callId) {
    errors.push(CALL_ID_MISSING);
  }

  if (!feedback.experienceRate) {
    errors.push(EXPERIENCE_RATE_MISSING);
  }

  if (!feedback.quality) {
    errors.push(QUALITY_MISSING);
  }

  return errors;
}

exports.checkCustomerFeedbackConsistency = checkCustomerFeedbackConsistency;
exports.checkOperatorFeedbackConsistency = checkOperatorFeedbackConsistency;
exports.checkCallExistence = checkCallExistence;
exports.saveCustomerFeedback = saveCustomerFeedback;
exports.saveOperatorFeedback = saveOperatorFeedback;
