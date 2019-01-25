const CustomersRoom = require('../components/rooms/CustomersRoom');
const OperatorsRoom = require('../components/rooms/OperatorsRoom');

const createCustomersRoom = (...args) => new CustomersRoom(...args);
const createOperatorsRoom = (...args) => new OperatorsRoom(...args);

exports.createCustomersRoom = createCustomersRoom;
exports.createOperatorsRoom = createOperatorsRoom;
