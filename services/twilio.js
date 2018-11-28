const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
const client = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

function createRoom(identity) {
  console.log('createRoom', identity);
  return client.video.rooms.create({
    enableTurn: true,
    statusCallback: '',
    type: 'peer-to-peer',
    uniqueName: identity,
  });
}

function checkRoom(identity) {
  console.log('checkRoom', identity);
  // return new Promise((resolve) => {
  //   client.video.rooms.each({ uniqueName: identity }, resolve);
  // });
  // return client.video.rooms(identity).fetch().then(console.log).catch(console.error);
  return client.video.rooms.list()
    .then((rooms = []) => rooms.find(r => r.uniqueName === identity));
}

function checkAndCreateRoom(identity) {
  return checkRoom(identity)
    .then(room => room || createRoom(identity));
}

exports.createRoom = createRoom;
exports.checkRoom = checkRoom;
exports.checkAndCreateRoom = checkAndCreateRoom;
