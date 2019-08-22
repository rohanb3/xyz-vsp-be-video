const CustomersRoom = require('./CustomersRoom');
const OperatorsRoom = require('./OperatorsRoom');

const RoomMediator = require('./roomMediator');

const roomMediator = new RoomMediator();

const createCustomersRoom = io => new CustomersRoom(io, roomMediator);
const createOperatorsRoom = io => new OperatorsRoom(io, roomMediator);

exports.createCustomersRoom = createCustomersRoom;
exports.createOperatorsRoom = createOperatorsRoom;
