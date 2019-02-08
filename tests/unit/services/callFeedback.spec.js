jest.mock('@/models/call');

const callsDBClient = require('@/services/callsDBClient');
const callFeedback = require('@/services/callFeedback');
const {
  CALL_ID_MISSING,
  FEEDBACK_MISSING,
  CUSTOMER_ID_MISSING,
  EXPERIENCE_RATE_MISSING,
  QUALITY_MISSING,
} = require('@/constants/feedbackErrors');

describe('callFeedback: ', () => {
  describe('saveCustomerFeedback(): ', () => {
    beforeEach(() => {
      callsDBClient.updateById = jest.fn(() => Promise.resolve());
    });

    it('should update call by id', () => {
      const callId = 'call42';
      const feedback = {
        customerId: 'customer42',
        experienceRate: 5,
        quality: 3,
      };
      const expectedUpdates = { customerFeedback: feedback };

      return callFeedback.saveCustomerFeedback(callId, feedback)
        .then(() => {
          expect(callsDBClient.updateById).toHaveBeenCalledWith(callId, expectedUpdates);
        });
    });

    it('should reject with correct error if no callId', () => {
      const feedback = {
        customerId: 'customer42',
        experienceRate: 5,
        quality: 3,
      };
      const expectedErrors = [CALL_ID_MISSING];

      return callFeedback.saveCustomerFeedback(null, feedback)
        .catch((errors) => {
          expect(callsDBClient.updateById).not.toHaveBeenCalled();
          expect(errors).toEqual(expectedErrors);
        });
    });

    it('should reject with correct error if no feedback', () => {
      const callId = 'call42';
      const expectedErrors = [FEEDBACK_MISSING];

      return callFeedback.saveCustomerFeedback(callId)
        .catch((errors) => {
          expect(callsDBClient.updateById).not.toHaveBeenCalled();
          expect(errors).toEqual(expectedErrors);
        });
    });

    it('should reject with correct error if no customerId', () => {
      const callId = 'call42';
      const feedback = {
        experienceRate: 5,
        quality: 3,
      };
      const expectedErrors = [CUSTOMER_ID_MISSING];

      return callFeedback.saveCustomerFeedback(callId, feedback)
        .catch((errors) => {
          expect(callsDBClient.updateById).not.toHaveBeenCalled();
          expect(errors).toEqual(expectedErrors);
        });
    });

    it('should reject with correct error if no experienceRate', () => {
      const callId = 'call42';
      const feedback = {
        customerId: 'customer42',
        quality: 3,
      };
      const expectedErrors = [EXPERIENCE_RATE_MISSING];

      return callFeedback.saveCustomerFeedback(callId, feedback)
        .catch((errors) => {
          expect(callsDBClient.updateById).not.toHaveBeenCalled();
          expect(errors).toEqual(expectedErrors);
        });
    });

    it('should reject with correct error if no quality', () => {
      const callId = 'call42';
      const feedback = {
        customerId: 'customer42',
        experienceRate: 3,
      };
      const expectedErrors = [QUALITY_MISSING];

      return callFeedback.saveCustomerFeedback(callId, feedback)
        .catch((errors) => {
          expect(callsDBClient.updateById).not.toHaveBeenCalled();
          expect(errors).toEqual(expectedErrors);
        });
    });
  });
});
