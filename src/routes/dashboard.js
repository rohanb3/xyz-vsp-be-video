const dashboard = require('@/services/calls/dashboard');

exports.getDurations = async (request, response) => {
  const { tenantId, from, to, callType, callStatus } = request.query;

  try {
    const calls = await dashboard.getAggregatedDurations({
      to,
      from,
      tenantId,
      callType,
      callStatus,
    });

    return response.status(200).json(calls);
  } catch (err) {
    return response.status(500).json(err);
  }
};
