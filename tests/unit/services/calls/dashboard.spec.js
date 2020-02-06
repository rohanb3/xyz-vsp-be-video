const dashboard = require('@/services/calls/dashboard');
const callsDBClient = require('@/services/calls/DBClient');

describe('Dashboard service: ', () => {
  describe('getAggregatedDurations(): ', () => {
    it('should return correct result', () => {
      const expectedResult = {
        _id: null,
        total: 335,
        maxCallDuration: 123,
        averageCallDuration: 32,
        totalCallDuration: 3321,
        maxWaitingDuration: 12,
        averageWaitingDuration: 4,
        totalWaitingDuration: 392,
      };

      const filters = {
        callStatus: 'call.answered',
        callType: 'call.video',
        from: '2020-01-01',
        tenantId: 'test',
        to: '2020-01-02',
      };

      callsDBClient.aggregateDurations = jest
        .fn()
        .mockResolvedValue(expectedResult);

      return dashboard.getAggregatedDurations(filters).then(result => {
        expect(result).toBe(expectedResult);
        expect(callsDBClient.aggregateDurations).toHaveBeenCalledWith(filters);
      });
    });
  });
});
