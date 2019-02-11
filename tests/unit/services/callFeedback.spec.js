jest.mock('@/models/call');

const callsDBClient = require('@/services/callsDBClient');
const callFeedback = require('@/services/callFeedback');
const {
  CALL_ID_MISSING,
  CUSTOMER_ID_MISSING,
  OPERATOR_ID_MISSING,
  EXPERIENCE_RATE_MISSING,
  QUALITY_MISSING,
} = require('@/constants/feedbackErrors');

describe('callFeedback: ', () => {
  describe('saveCustomerFeedback(): ', () => {
    beforeEach(() => {
      callsDBClient.updateById = jest.fn(() => Promise.resolve());
    });

    it('should update call', () => {
      const callId = 'call42';
      const feedback = {
        customerId: 'customer42',
        experienceRate: 5,
        quality: 3,
      };

      return callFeedback.saveCustomerFeedback(callId, feedback)
        .then(() => {
          expect(callsDBClient.updateById)
            .toHaveBeenCalledWith(callId, { customerFeedback: feedback });
        });
    });
  });

  describe('saveOperatorFeedback(): ', () => {
    beforeEach(() => {
      callsDBClient.updateById = jest.fn(() => Promise.resolve());
    });

    it('should update call', () => {
      const callId = 'call42';
      const feedback = {
        customerId: 'customer42',
        experienceRate: 5,
        quality: 3,
      };

      return callFeedback.saveOperatorFeedback(callId, feedback)
        .then(() => {
          expect(callsDBClient.updateById)
            .toHaveBeenCalledWith(callId, { operatorFeedback: feedback });
        });
    });
  });

  describe('checkCallExistence(): ', () => {
    it('should return true if call exists', () => {
      callsDBClient.findById = jest.fn(() => Promise.resolve({}));

      return callFeedback.checkCallExistence('42')
        .then(isExist => expect(isExist).toBeTrue);
    });

    it('should return false if call not exists', () => {
      callsDBClient.findById = jest.fn(() => Promise.resolve(null));

      return callFeedback.checkCallExistence('42')
        .then(isExist => expect(isExist).toBeFalse);
    });
  });

  describe('checkCustomerFeedbackConsistency(): ', () => {
    it('should return empty array if feedback is consistent', () => {
      const callId = 'call42';
      const feedback = {
        customerId: 'customer42',
        experienceRate: 5,
        quality: 3,
      };

      expect(callFeedback.checkCustomerFeedbackConsistency(callId, feedback)).toEqual([]);
    });

    it('should return correct error if no callId', () => {
      const feedback = {
        customerId: 'customer42',
        experienceRate: 5,
        quality: 3,
      };
      const expectedErrors = [CALL_ID_MISSING];

      expect(callFeedback.checkCustomerFeedbackConsistency(null, feedback)).toEqual(expectedErrors);
    });

    it('should return correct error if no customerId', () => {
      const callId = 'call42';
      const feedback = {
        experienceRate: 5,
        quality: 3,
      };
      const expectedErrors = [CUSTOMER_ID_MISSING];

      expect(callFeedback.checkCustomerFeedbackConsistency(callId, feedback))
        .toEqual(expectedErrors);
    });

    it('should return correct error if no experienceRate', () => {
      const callId = 'call42';
      const feedback = {
        customerId: 'customer42',
        quality: 3,
      };
      const expectedErrors = [EXPERIENCE_RATE_MISSING];

      expect(callFeedback.checkCustomerFeedbackConsistency(callId, feedback))
        .toEqual(expectedErrors);
    });

    it('should return correct error if no quality', () => {
      const callId = 'call42';
      const feedback = {
        customerId: 'customer42',
        experienceRate: 3,
      };
      const expectedErrors = [QUALITY_MISSING];

      expect(callFeedback.checkCustomerFeedbackConsistency(callId, feedback))
        .toEqual(expectedErrors);
    });
  });

  describe('checkOperatorFeedbackConsistency(): ', () => {
    it('should return empty array if feedback is consistent', () => {
      const callId = 'call42';
      const feedback = {
        operatorId: 'operator42',
        experienceRate: 5,
        quality: 3,
      };

      expect(callFeedback.checkOperatorFeedbackConsistency(callId, feedback)).toEqual([]);
    });

    it('should return correct error if no callId', () => {
      const feedback = {
        operatorId: 'operator42',
        experienceRate: 5,
        quality: 3,
      };
      const expectedErrors = [CALL_ID_MISSING];

      expect(callFeedback.checkOperatorFeedbackConsistency(null, feedback)).toEqual(expectedErrors);
    });

    it('should return correct error if no operatorId', () => {
      const callId = 'call42';
      const feedback = {
        experienceRate: 5,
        quality: 3,
      };
      const expectedErrors = [OPERATOR_ID_MISSING];

      expect(callFeedback.checkOperatorFeedbackConsistency(callId, feedback))
        .toEqual(expectedErrors);
    });

    it('should return correct error if no experienceRate', () => {
      const callId = 'call42';
      const feedback = {
        operatorId: 'operator42',
        quality: 3,
      };
      const expectedErrors = [EXPERIENCE_RATE_MISSING];

      expect(callFeedback.checkOperatorFeedbackConsistency(callId, feedback))
        .toEqual(expectedErrors);
    });

    it('should return correct error if no quality', () => {
      const callId = 'call42';
      const feedback = {
        operatorId: 'operator42',
        experienceRate: 3,
      };
      const expectedErrors = [QUALITY_MISSING];

      expect(callFeedback.checkOperatorFeedbackConsistency(callId, feedback))
        .toEqual(expectedErrors);
    });
  });
});
