function callDetailDTO(call, duration) {
  return {
    id: call._id,
    date: call.acceptedAt,
    operator: call.acceptedBy,
    retailer: call.retailer,
    operatorFeedback: call.operatorFeedback,
    customerFeedback: call.customerFeedback,
    duration: duration,
  };
}

module.exports = callDetailDTO;
