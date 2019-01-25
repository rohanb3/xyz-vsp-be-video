const CustomersRoom = require('../components/rooms/CustomersRoom');
const OperatorsRoom = require('../components/rooms/OperatorsRoom');

const createCutomersRoom = (socket, pendingCalls) => new CustomersRoom(socket, pendingCalls);
const createOperatorsRoom = (socket, pendingCalls) => new OperatorsRoom(socket, pendingCalls);

exports.createCutomersRoom = createCutomersRoom;
exports.createOperatorsRoom = createOperatorsRoom;
