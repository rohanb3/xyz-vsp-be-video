/* eslint-disable no-use-before-define */

const callsDBClient = require('@/services/calls/DBClient');
const { CallUpdateError } = require('@/services/calls/errors');
const {
  CALL_NOT_EXIST,
  OPERATOR_ID_MISSING,
  CUSTOMER_ID_MISSING,
  EXPERIENCE_RATE_MISSING,
  QUALITY_MISSING,
} = require('@/constants/feedbackErrors');

const CUSTOMER_FEEDBACK = 'customerFeedback';
const OPERATOR_FEEDBACK = 'operatorFeedback';

const consistencyValidators = {
  [CUSTOMER_FEEDBACK]: checkCustomerFeedbackConsistency,
  [OPERATOR_FEEDBACK]: checkOperatorFeedbackConsistency,
};

function validateAndSaveFeedback(callId, feedback, feedbackType) {
  const consistencyErrors = consistencyValidators[feedbackType](feedback);

  if (consistencyErrors.length) {
    return Promise.reject(new CallUpdateError(consistencyErrors));
  }

  const updates = { [feedbackType]: feedback };
  return callsDBClient
    .getById(callId)
    .then(call => {
      if (!call) {
        return Promise.reject(new CallUpdateError([CALL_NOT_EXIST]));
      }

      const callWithUpdates = Object.assign(call, updates);
      const validationError = callsDBClient.validateSync(callWithUpdates);

      if (validationError) {
        const messages = Object.values(validationError.errors).map(
          e => e.message
        );
        return Promise.reject(new CallUpdateError(messages));
      }

      return Promise.resolve();
    })
    .then(() => callsDBClient.updateById(callId, updates));
}

function checkCustomerFeedbackConsistency(feedback = {}) {
  const errors = checkBaseFeedbackConsistency(feedback);

  if (!feedback.customerId) {
    errors.push(CUSTOMER_ID_MISSING);
  }

  if (!feedback.experienceRate) {
    errors.push(EXPERIENCE_RATE_MISSING);
  }

  return errors;
}

function checkOperatorFeedbackConsistency(feedback = {}) {
  const errors = checkBaseFeedbackConsistency(feedback);

  if (!feedback.operatorId) {
    errors.push(OPERATOR_ID_MISSING);
  }

  return errors;
}

function checkBaseFeedbackConsistency(feedback = {}) {
  const errors = [];

  if (!feedback.quality) {
    errors.push(QUALITY_MISSING);
  }

  return errors;
}

exports.validateAndSaveFeedback = validateAndSaveFeedback;
exports.feedbackTypes = {
  CUSTOMER_FEEDBACK,
  OPERATOR_FEEDBACK,
};
