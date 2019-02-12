/* eslint-disable no-use-before-define */

const callsDBClient = require('@/services/callsDBClient');
const { MongoUpdateError } = require('@/services/errors');
const {
  CALL_ID_MISSING,
  OPERATOR_ID_MISSING,
  CUSTOMER_ID_MISSING,
  EXPERIENCE_RATE_MISSING,
  QUALITY_MISSING,
} = require('@/constants/feedbackErrors');

function saveCustomerFeedback(callId, feedback = {}) {
  return saveFeedback(callId, feedback, 'customerFeedback');
}

function saveOperatorFeedback(callId, feedback = {}) {
  return saveFeedback(callId, feedback, 'operatorFeedback');
}

function saveFeedback(callId, feedback, fieldName) {
  return callsDBClient.updateById(callId, { [fieldName]: feedback })
    .catch(({ errors }) => {
      const messages = Object.values(errors).map(e => e.message);
      return Promise.reject(new MongoUpdateError(messages));
    });
}

function checkCallExistence(callId) {
  return callsDBClient.getById(callId)
    .then(Boolean)
    .catch(() => false);
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
