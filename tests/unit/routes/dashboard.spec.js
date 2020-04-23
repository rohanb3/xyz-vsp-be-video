jest.mock('@/routes/utils');
jest.mock('@/services/filtersValidator');

const request = require('supertest');
const app = require('@/app');

const dashboard = require('@/services/calls/dashboard');

const UndefinedDuration = require('@/models/aggregations/durations');
const UndefinedCallbacks = require('@/models/aggregations/callbacks');

describe('Dashboard routes:', () => {
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
          expect(dashboard.getAggregatedDurations).toHaveBeenCalledWith(
            filters
          );
        });
    });

    it('should return 500 if there is unexpected rejection', () => {
      const error = { text: 'Something went wrong' };
      dashboard.getAggregatedDurations = jest.fn().mockRejectedValue(error);

      return request(app)
        .get('/api/video/dashboard/durations')
        .expect(500)
        .then(res => {
          expect(res.body).toStrictEqual(error);
        });
    });
  });

  describe('GET /api/video/dashboard/callbacks', () => {
    it('should return 200 and expected value', () => {
      const filters = {
        from: '2020-01-01',
        tenantId: 'test',
        to: '2020-01-02',
      };

      dashboard.getAggregatedCallbacks = jest
        .fn()
        .mockResolvedValue(UndefinedCallbacks);

      return request(app)
        .get(
          '/api/video/dashboard/callbacks?' +
            'tenantId=test&from=2020-01-01&to=2020-01-02&'
        )
        .expect(200)
        .then(res => {
          expect(res.body).toEqual(UndefinedCallbacks);
          expect(dashboard.getAggregatedCallbacks).toHaveBeenCalledWith(
            filters
          );
        });
    });

    it('should return 500 if there is unexpected rejection', () => {
      const error = { text: 'Something went wrong' };
      dashboard.getAggregatedCallbacks = jest.fn().mockRejectedValue(error);

      return request(app)
        .get('/api/video/dashboard/durations')
        .expect(500)
        .then(res => {
          expect(res.body).toStrictEqual(error);
        });
    });
  });
});
