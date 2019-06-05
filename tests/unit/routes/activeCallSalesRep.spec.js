/* eslint-disable jest/no-test-prefixes, jest/no-disabled-tests */
jest.mock('@/services/calls/feedback');

const request = require('supertest');
const app = require('@/app');
const calls = require('@/services/calls/calls');

describe('GET /api/video/active-call-salesrep: ', () => {
  it('should return 200 if call was found', () => {
    const call = {
      salesRepId: 'salesRep42',
    };

    calls.getActiveCall = jest.fn(() => Promise.resolve(call));

    return request(app)
      .get('/api/video/active-call-salesrep/42')
      .expect(200)
      .then(res => {
        expect(res.body).toEqual(call);
        expect(calls.getActiveCall).toHaveBeenCalledWith('42');
      });
  });

  it('should return 404 if call was not found', () => {
    calls.getActiveCall = jest.fn(() => Promise.resolve());

    return request(app)
      .get('/api/video/active-call-salesrep/42')
      .expect(404)
      .then(() => {
        expect(calls.getActiveCall).toHaveBeenCalledWith('42');
      });
  });

  it('should return 404 if call finding was failed', () => {
    calls.getActiveCall = jest.fn(() => Promise.reject());

    return request(app)
      .get('/api/video/active-call-salesrep/42')
      .expect(404)
      .then(() => {
        expect(calls.getActiveCall).toHaveBeenCalledWith('42');
      });
  });
});
