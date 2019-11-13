const CustomersRoom = require('./CustomersRoom');
const OperatorsRoom = require('./OperatorsRoom');

const RoomsMediator = require('./RoomsMediator');

const roomsMediator = new RoomsMediator();

const createCustomersRoom = io => new CustomersRoom(io, roomsMediator);
const createOperatorsRoom = io => new OperatorsRoom(io, roomsMediator);

exports.createCustomersRoom = createCustomersRoom;
exports.createOperatorsRoom = createOperatorsRoom;
