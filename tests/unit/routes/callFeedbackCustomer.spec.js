/* eslint-disable jest/no-test-prefixes, jest/no-disabled-tests */
jest.mock('@/services/callFeedback');

const request = require('supertest');
const app = require('@/app');
const callFeedback = require('@/services/callFeedback');
const { CallUpdateError } = require('@/services/errors');

describe('POST /call-feedback-customer: ', () => {
  it('should return 200 if feedback was saved', () => {
    const callId = 'call42';
    const feedback = {
      customerId: 'customer42',
    };

    callFeedback.checkCustomerFeedbackConsistency = jest.fn(() => []);
    callFeedback.checkCallExistence = jest.fn(() => Promise.resolve(true));
    callFeedback.saveCustomerFeedback = jest.fn(() => Promise.resolve());

    return request(app)
      .post('/call-feedback-customer')
      .send({ callId, ...feedback })
      .expect(200)
      .then(() => {
        expect(callFeedback.saveCustomerFeedback).toHaveBeenCalledWith(callId, feedback);
      });
  });

  it('should return 400 and do not try to save if feedback is not consistent', () => {
    const callId = 'call42';
    const feedback = {
      customerId: 'customer42',
    };

    const messages = [
      'error1',
      'error2',
    ];

    callFeedback.checkCustomerFeedbackConsistency = jest.fn(() => messages);
    callFeedback.checkCallExistence = jest.fn(() => Promise.resolve(true));
    callFeedback.saveCustomerFeedback = jest.fn(() => Promise.resolve());

    return request(app)
      .post('/call-feedback-customer')
      .send({ callId, ...feedback })
      .expect(400)
      .then((res) => {
        expect(res.body.messages).toEqual(messages);
        expect(callFeedback.saveCustomerFeedback).not.toHaveBeenCalled();
        expect(callFeedback.checkCallExistence).not.toHaveBeenCalled();
      });
  });

  it('should return 404 and do not try to save if no call exists', () => {
    const callId = 'call42';
    const feedback = {
      customerId: 'customer42',
    };

    callFeedback.checkCustomerFeedbackConsistency = jest.fn(() => []);
    callFeedback.checkCallExistence = jest.fn(() => Promise.resolve(false));
    callFeedback.saveCustomerFeedback = jest.fn(() => Promise.resolve());

    return request(app)
      .post('/call-feedback-customer')
      .send({ callId, ...feedback })
      .expect(404)
      .then(() => {
        expect(callFeedback.checkCallExistence).toHaveBeenCalled();
        expect(callFeedback.saveCustomerFeedback).not.toHaveBeenCalled();
      });
  });

  it('should return 400 if saving failed with CallUpdateError', () => {
    const callId = 'call42';
    const feedback = {
      customerId: 'customer42',
    };
    const message = 'inner error';
    const error = new CallUpdateError([message]);

    callFeedback.checkCustomerFeedbackConsistency = jest.fn(() => []);
    callFeedback.checkCallExistence = jest.fn(() => Promise.resolve(true));
    callFeedback.saveCustomerFeedback = jest.fn(() => Promise.reject(error));

    return request(app)
      .post('/call-feedback-customer')
      .send({ callId, ...feedback })
      .expect(400)
      .then((res) => {
        expect(res.body.messages).toEqual([message]);
        expect(callFeedback.saveCustomerFeedback).toHaveBeenCalledWith(callId, feedback);
      });
  });

  it('should return 500 if saving failed', () => {
    const callId = 'call42';
    const feedback = {
      customerId: 'customer42',
    };
    const message = 'inner error';
    const error = new Error(message);

    callFeedback.checkCustomerFeedbackConsistency = jest.fn(() => []);
    callFeedback.checkCallExistence = jest.fn(() => Promise.resolve(true));
    callFeedback.saveCustomerFeedback = jest.fn(() => Promise.reject(error));

    return request(app)
      .post('/call-feedback-customer')
      .send({ callId, ...feedback })
      .expect(500)
      .then((res) => {
        expect(res.body.messages).toEqual([message]);
        expect(callFeedback.saveCustomerFeedback).toHaveBeenCalledWith(callId, feedback);
      });
  });
});
