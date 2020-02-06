jest.mock('@/routes/utils');
jest.mock('@/services/filtersValidator');

const request = require('supertest');
const app = require('@/app');

const dashboard = require('@/services/calls/dashboard');

const UndefinedDuration = require('@/models/aggregations/durations');

describe('GET /api/video/dashboard/durations', () => {
  it('should return 200 and expected value', () => {
    const filters = {
      callStatus: 'call.answered',
      callType: 'call.video',
      from: '2020-01-01',
      tenantId: 'test',
      to: '2020-01-02',
    };

    dashboard.getAggregatedDurations = jest
      .fn()
      .mockResolvedValue(UndefinedDuration);

    return request(app)
      .get(
        '/api/video/dashboard/durations?' +
          'tenantId=test&from=2020-01-01&to=2020-01-02&' +
          'callType=call.video&&callStatus=call.answered'
      )
      .expect(200)
      .then(res => {
        expect(res.body).toEqual(UndefinedDuration);
        expect(dashboard.getAggregatedDurations).toHaveBeenCalledWith(filters);
      });
  });

  it('should return 500 if there is unexpected rejection', () => {
    const error = { text: 'Something went wrong' };
    dashboard.getAggregatedDurations = jest.fn().mockRejectedValue(error);

    return request(app)
      .get('/api/video/dashboard/durations')
      .expect(500)
      .then(res => {
        expect(res.body).toEqual(error);
      });
  });
});
