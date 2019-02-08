/* eslint-disable jest/no-test-prefixes, jest/no-disabled-tests */
jest.mock('@/services/callFeedback');

const request = require('supertest');
const app = require('@/app');
const callFeedback = require('@/services/callFeedback');

xdescribe('POST /call-feedback-mobile: ', () => {
  beforeEach(() => {
    callFeedback.saveCustomerFeedback = jest.fn(() => Promise.resolve());
  });

  it('should return 200 if feedback was saved', () => {
    const callId = 'call42';
    const feedback = {
      customerId: 'customer42',
    };
    return request(app)
      .post('/call-feedback-mobile')
      .set({ callId, ...feedback })
      .expect(200)
      .then(() => {
        expect(callFeedback.saveCustomerFeedback).toHaveBeenCalledWith(callId, feedback);
      });
  });
});
