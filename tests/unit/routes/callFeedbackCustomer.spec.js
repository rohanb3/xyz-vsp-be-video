jest.mock('@/services/calls/feedback');
jest.mock('@/routes/utils');

const request = require('supertest');
const app = require('@/app');
const callFeedback = require('@/services/calls/feedback');
const { CallUpdateError } = require('@/services/calls/errors');

const { CUSTOMER_FEEDBACK } = callFeedback.feedbackTypes;

describe('POST /api/video/call-feedback-customer: ', () => {
  it('should return 200 if feedback was saved', () => {
    const callId = 'call42';
    const feedback = {
      customerId: 'customer42',
    };

    callFeedback.validateAndSaveFeedback = jest.fn(() => Promise.resolve());

    return request(app)
      .post('/api/video/call-feedback-customer')
      .send({ callId, ...feedback })
      .expect(200)
      .then(() => {
        expect(callFeedback.validateAndSaveFeedback).toHaveBeenCalledWith(
          callId,
          feedback,
          CUSTOMER_FEEDBACK
        );
      });
  });

  it('should return 400 if feedback was inconsistent', () => {
    const callId = 'call42';
    const feedback = {
      customerId: 'customer42',
    };

    const messages = ['error1', 'error2'];

    const error = new CallUpdateError(messages);

    callFeedback.validateAndSaveFeedback = jest.fn(() => Promise.reject(error));

    return request(app)
      .post('/api/video/call-feedback-customer')
      .send({ callId, ...feedback })
      .expect(400)
      .then(res => {
        expect(res.body.messages).toEqual(messages);
        expect(callFeedback.validateAndSaveFeedback).toHaveBeenCalledWith(
          callId,
          feedback,
          CUSTOMER_FEEDBACK
        );
      });
  });

  it('should return 500 if some unpredicted error happened', () => {
    const callId = 'call42';
    const feedback = {
      customerId: 'customer42',
    };
    const message = 'inner error';
    const error = new Error(message);

    callFeedback.checkCustomerFeedbackConsistency = jest.fn(() => []);
    callFeedback.checkCallExistence = jest.fn(() => Promise.resolve(true));
    callFeedback.validateAndSaveFeedback = jest.fn(() => Promise.reject(error));

    return request(app)
      .post('/api/video/call-feedback-customer')
      .send({ callId, ...feedback })
      .expect(500)
      .then(res => {
        expect(res.body.messages).toEqual([message]);
        expect(callFeedback.validateAndSaveFeedback).toHaveBeenCalledWith(
          callId,
          feedback,
          CUSTOMER_FEEDBACK
        );
      });
  });
});
