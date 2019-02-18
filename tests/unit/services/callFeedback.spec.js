jest.mock('@/models/call');

const callsDBClient = require('@/services/callsDBClient');
const callFeedback = require('@/services/callFeedback');
const { CallUpdateError } = require('@/services/errors');
const {
  CALL_ID_MISSING,
  CALL_NOT_EXIST,
  CUSTOMER_ID_MISSING,
  OPERATOR_ID_MISSING,
  EXPERIENCE_RATE_MISSING,
  QUALITY_MISSING,
} = require('@/constants/feedbackErrors');

const { CUSTOMER_FEEDBACK, OPERATOR_FEEDBACK } = callFeedback.feedbackTypes;

describe('callFeedback: ', () => {
  describe('validateAndSaveFeedback(): ', () => {
    let call = null;
    beforeEach(() => {
      call = {
        id: 'call42',
      };
      callsDBClient.getById = jest.fn(() => Promise.resolve(call));
      callsDBClient.updateById = jest.fn(() => Promise.resolve());
      callsDBClient.validateSync = jest.fn(() => null);
    });

    it('should update call', () => {
      const callId = 'call42';
      const feedback = {
        customerId: 'customer42',
        experienceRate: 3,
        quality: 4,
      };
      const expectedUpdates = {
        customerFeedback: feedback,
      };

      callsDBClient.getById = jest.fn(() => Promise.resolve(call));

      return callFeedback.validateAndSaveFeedback(callId, feedback, CUSTOMER_FEEDBACK)
        .then(() => {
          expect(callsDBClient.getById).toHaveBeenCalledWith(callId);
          expect(callsDBClient.validateSync)
            .toHaveBeenCalledWith({ ...call, customerFeedback: feedback });
          expect(callsDBClient.updateById).toHaveBeenCalledWith(callId, expectedUpdates);
        });
    });

    it('should reject with CallUpdateError if no callId', () => {
      const feedback = {
        customerId: 'customer42',
        experienceRate: 5,
        quality: 3,
      };

      return callFeedback.validateAndSaveFeedback(null, feedback, CUSTOMER_FEEDBACK)
        .catch((err) => {
          expect(err).toBeInstanceOf(CallUpdateError);
          expect(err.messages).toEqual([CALL_ID_MISSING]);
          expect(callsDBClient.getById).not.toHaveBeenCalled();
          expect(callsDBClient.validateSync).not.toHaveBeenCalled();
          expect(callsDBClient.updateById).not.toHaveBeenCalled();
        });
    });

    it('should return correct error if no customerId', () => {
      const callId = 'call42';
      const feedback = {
        experienceRate: 5,
        quality: 3,
      };
      return callFeedback.validateAndSaveFeedback(callId, feedback, CUSTOMER_FEEDBACK)
        .catch((err) => {
          expect(err).toBeInstanceOf(CallUpdateError);
          expect(err.messages).toEqual([CUSTOMER_ID_MISSING]);
        });
    });

    it('should return correct error if no operatorId', () => {
      const callId = 'call42';
      const feedback = {
        experienceRate: 5,
        quality: 3,
      };
      return callFeedback.validateAndSaveFeedback(callId, feedback, OPERATOR_FEEDBACK)
        .catch((err) => {
          expect(err).toBeInstanceOf(CallUpdateError);
          expect(err.messages).toEqual([OPERATOR_ID_MISSING]);
          expect(callsDBClient.getById).not.toHaveBeenCalled();
          expect(callsDBClient.validateSync).not.toHaveBeenCalled();
          expect(callsDBClient.updateById).not.toHaveBeenCalled();
        });
    });

    it('should return correct error if no experienceRate', () => {
      const callId = 'call42';
      const feedback = {
        customerId: 'customer42',
        quality: 3,
      };

      return callFeedback.validateAndSaveFeedback(callId, feedback, CUSTOMER_FEEDBACK)
        .catch((err) => {
          expect(err).toBeInstanceOf(CallUpdateError);
          expect(err.messages).toEqual([EXPERIENCE_RATE_MISSING]);
          expect(callsDBClient.getById).not.toHaveBeenCalled();
          expect(callsDBClient.validateSync).not.toHaveBeenCalled();
          expect(callsDBClient.updateById).not.toHaveBeenCalled();
        });
    });

    it('should return correct error if no quality', () => {
      const callId = 'call42';
      const feedback = {
        customerId: 'customer42',
        experienceRate: 3,
      };

      return callFeedback.validateAndSaveFeedback(callId, feedback, CUSTOMER_FEEDBACK)
        .catch((err) => {
          expect(err).toBeInstanceOf(CallUpdateError);
          expect(err.messages).toEqual([QUALITY_MISSING]);
          expect(callsDBClient.getById).not.toHaveBeenCalled();
          expect(callsDBClient.validateSync).not.toHaveBeenCalled();
          expect(callsDBClient.updateById).not.toHaveBeenCalled();
        });
    });

    it('should return correct error if no call exists', () => {
      const callId = 'call42';
      const feedback = {
        customerId: 'customer42',
        experienceRate: 3,
        quality: 4,
      };

      callsDBClient.getById = jest.fn(() => Promise.resolve(null));

      return callFeedback.validateAndSaveFeedback(callId, feedback, CUSTOMER_FEEDBACK)
        .catch((err) => {
          expect(err).toBeInstanceOf(CallUpdateError);
          expect(err.messages).toEqual([CALL_NOT_EXIST]);
          expect(callsDBClient.getById).toHaveBeenCalledWith(callId);
          expect(callsDBClient.validateSync).not.toHaveBeenCalled();
          expect(callsDBClient.updateById).not.toHaveBeenCalled();
        });
    });

    it('should return correct error if validation failed', () => {
      const callId = 'call42';
      const feedback = {
        customerId: 'customer42',
        experienceRate: 3,
        quality: 4,
      };
      const expectedUpdates = {
        customerFeedback: feedback,
      };

      const expectedErrors = ['error1', 'error2'];
      const error = {
        errors: [
          {
            message: 'error1',
          },
          {
            message: 'error2',
          },
        ],
      };

      callsDBClient.getById = jest.fn(() => Promise.resolve(call));
      callsDBClient.validateSync = jest.fn(() => error);

      return callFeedback.validateAndSaveFeedback(callId, feedback, CUSTOMER_FEEDBACK)
        .catch((err) => {
          expect(err).toBeInstanceOf(CallUpdateError);
          expect(err.messages).toEqual(expectedErrors);
          expect(callsDBClient.getById).toHaveBeenCalledWith(callId);
          expect(callsDBClient.validateSync)
            .toHaveBeenCalledWith({ ...call, ...expectedUpdates });
          expect(callsDBClient.updateById).not.toHaveBeenCalled();
        });
    });
  });
});
