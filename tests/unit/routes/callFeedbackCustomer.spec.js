/* eslint-disable jest/no-test-prefixes, jest/no-disabled-tests */
jest.mock('@/services/callFeedback');

const request = require('supertest');
const app = require('@/app');
const callFeedback = require('@/services/callFeedback');

describe('POST /call-feedback-customer: ', () => {
  it('should return 200 if feedback was saved', () => {
    const callId = 'call42';
    const feedback = {
      customerId: 'customer42',
    };

    callFeedback.saveCustomerFeedback = jest.fn(() => Promise.resolve());

    return request(app)
      .post('/call-feedback-customer')
      .send({ callId, ...feedback })
      .expect(200)
      .then(() => {
        expect(callFeedback.saveCustomerFeedback).toHaveBeenCalledWith(callId, feedback);
      });
  });

  it('should return 400 and errors if feedback was not saved', () => {
    const callId = 'call42';
    const feedback = {
      customerId: 'customer42',
    };

    const errors = [
      'error1',
      'error2',
    ];

    callFeedback.saveCustomerFeedback = jest.fn(() => Promise.reject(errors));

    return request(app)
      .post('/call-feedback-customer')
      .send({ callId, ...feedback })
      .set('Accept', 'application/json')
      .expect(400)
      .then((res) => {
        expect(res.body.errors).toEqual(errors);
        expect(callFeedback.saveCustomerFeedback).toHaveBeenCalledWith(callId, feedback);
      });
  });
});
