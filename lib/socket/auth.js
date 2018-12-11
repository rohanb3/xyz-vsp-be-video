function authenticateOperator(socket, data, callback) {
  console.log('authenticate operator', data);
  return callback(null, true);
}

function authenticateCustomer(socket, data, callback) {
  console.log('authenticate customer', data);
  return callback(null, true);
}

exports.authenticateOperator = authenticateOperator;
exports.authenticateCustomer = authenticateCustomer;
