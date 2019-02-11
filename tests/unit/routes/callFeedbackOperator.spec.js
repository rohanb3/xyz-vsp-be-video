/* eslint-disable jest/no-test-prefixes, jest/no-disabled-tests */
jest.mock('@/services/callFeedback');

const request = require('supertest');
const app = require('@/app');
const callFeedback = require('@/services/callFeedback');

describe('POST /call-feedback-operator: ', () => {
  it('should return 200 if feedback was saved', () => {
    const callId = 'call42';
    const feedback = {
      operatorId: 'operator42',
    };

    callFeedback.checkOperatorFeedbackConsistency = jest.fn(() => []);
    callFeedback.checkCallExistence = jest.fn(() => Promise.resolve(true));
    callFeedback.saveOperatorFeedback = jest.fn(() => Promise.resolve());

    return request(app)
      .post('/call-feedback-operator')
      .send({ callId, ...feedback })
      .expect(200)
      .then(() => {
        expect(callFeedback.saveOperatorFeedback).toHaveBeenCalledWith(callId, feedback);
      });
  });

  it('should return 400 and do not try to save if feedback is not consistent', () => {
    const callId = 'call42';
    const feedback = {
      operatorId: 'operator42',
    };

    const errors = [
      'error1',
      'error2',
    ];

    callFeedback.checkOperatorFeedbackConsistency = jest.fn(() => errors);
    callFeedback.checkCallExistence = jest.fn(() => Promise.resolve(true));
    callFeedback.saveOperatorFeedback = jest.fn(() => Promise.resolve());

    return request(app)
      .post('/call-feedback-operator')
      .send({ callId, ...feedback })
      .expect(400)
      .then((res) => {
        expect(res.body.errors).toEqual(errors);
        expect(callFeedback.saveOperatorFeedback).not.toHaveBeenCalled();
        expect(callFeedback.checkCallExistence).not.toHaveBeenCalled();
      });
  });

  it('should return 404 and do not try to save if no call exists', () => {
    const callId = 'call42';
    const feedback = {
      operatorId: 'operator42',
    };

    callFeedback.checkOperatorFeedbackConsistency = jest.fn(() => []);
    callFeedback.checkCallExistence = jest.fn(() => Promise.resolve(false));
    callFeedback.saveOperatorFeedback = jest.fn(() => Promise.resolve());

    return request(app)
      .post('/call-feedback-operator')
      .send({ callId, ...feedback })
      .expect(404)
      .then(() => {
        expect(callFeedback.checkCallExistence).toHaveBeenCalled();
        expect(callFeedback.saveOperatorFeedback).not.toHaveBeenCalled();
      });
  });

  it('should return 500 if saving failed', () => {
    const callId = 'call42';
    const feedback = {
      operatorId: 'operator42',
    };
    const error = 'inner error';

    callFeedback.checkOperatorFeedbackConsistency = jest.fn(() => []);
    callFeedback.checkCallExistence = jest.fn(() => Promise.resolve(true));
    callFeedback.saveOperatorFeedback = jest.fn(() => Promise.reject(error));

    return request(app)
      .post('/call-feedback-operator')
      .send({ callId, ...feedback })
      .expect(500)
      .then((res) => {
        expect(res.body.errors).toEqual([error]);
        expect(callFeedback.saveOperatorFeedback).toHaveBeenCalledWith(callId, feedback);
      });
  });
});
