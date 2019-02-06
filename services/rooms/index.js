const CustomersRoom = require('./CustomersRoom');
const OperatorsRoom = require('./OperatorsRoom');

const createCustomersRoom = io => new CustomersRoom(io);
const createOperatorsRoom = io => new OperatorsRoom(io);

exports.createCustomersRoom = createCustomersRoom;
exports.createOperatorsRoom = createOperatorsRoom;
