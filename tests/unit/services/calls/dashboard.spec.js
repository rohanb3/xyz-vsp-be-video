const dashboard = require('@/services/calls/dashboard');
const callsDBClient = require('@/services/calls/DBClient');
const { callTypes } = require('@/constants/calls');

describe('Dashboard service: ', () => {
  describe('getAggregatedDurations(): ', () => {
    it('should return correct result', async () => {
      const aggregationResult = [
        {
          _id: null,
          total: 335,
          maxCallDuration: 123,
          averageCallDuration: 32,
          totalCallDuration: 3321,
          maxWaitingDuration: 12,
          averageWaitingDuration: 4,
          totalWaitingDuration: 392,
        },
      ];
      const [expectedResult] = aggregationResult;

      const filters = {
        callStatus: 'call.answered',
        callType: 'call.video',
        from: '2020-01-01',
        tenantId: 'test',
        to: '2020-01-02',
      };

      const aggregationArguments = [
        {
          $match: {
            callStatus: 'call.answered',
            callType: 'call.video',
            tenantId: 'test',
            requestedAt: { $lt: '2020-01-02', $gte: '2020-01-01' },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            maxCallDuration: { $max: '$callDuration' },
            averageCallDuration: { $avg: '$callDuration' },
            totalCallDuration: { $sum: '$callDuration' },
            maxWaitingDuration: { $max: '$waitingDuration' },
            averageWaitingDuration: { $avg: '$waitingDuration' },
            totalWaitingDuration: { $sum: '$waitingDuration' },
          },
        },
      ];

      callsDBClient.aggregate = jest.fn().mockResolvedValue(aggregationResult);

      const result = await dashboard.getAggregatedDurations(filters);

      expect(callsDBClient.aggregate).toHaveBeenCalledWith(
        aggregationArguments
      );
      expect(result).toBe(expectedResult);
    });
  });
  describe('getAggregatedCallbacks(): ', () => {
    it('should return correct result', async () => {
      const aggregationResult = [
        {
          _id: null,
          total: 335,
          answered: 300,
          missed: 35,
        },
      ];

      const [expectedResult] = aggregationResult;

      const filters = {
        from: '2020-01-01',
        tenantId: 'test',
      };

      const aggregationArguments = [
        { $addFields: { callbacksCount: { $size: '$callbacks' } } },
        {
          $match: {
            tenantId: 'test',
            requestedAt: { $gte: '2020-01-01' },
            callType: callTypes.VIDEO,
            callbacksCount: { $gte: 1 },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $size: '$callbacks' } },
            missed: {
              $sum: {
                $size: {
                  $filter: {
                    input: '$callbacks',
                    as: 'callback',
                    cond: {
                      $ne: [{ $ifNull: ['$$callback.declinedAt', true] }, true],
                    },
                  },
                },
              },
            },
            answered: {
              $sum: {
                $size: {
                  $filter: {
                    input: '$callbacks',
                    as: 'callback',
                    cond: {
                      $ne: [{ $ifNull: ['$$callback.acceptedAt', true] }, true],
                    },
                  },
                },
              },
            },
          },
        },
      ];

      callsDBClient.aggregate = jest.fn().mockResolvedValue(aggregationResult);

      const result = await dashboard.getAggregatedCallbacks(filters);

      expect(callsDBClient.aggregate).toHaveBeenCalledWith(
        aggregationArguments
      );
      expect(result).toBe(expectedResult);
    });
  });
});
