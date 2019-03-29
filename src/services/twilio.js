const twilio = require('twilio');

const logger = require('@/services/logger')(module);

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
} = require('@/constants/twilio');

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
const { AccessToken } = twilio.jwt;
const { VideoGrant } = AccessToken;

function getToken(identity) {
  const grant = new VideoGrant();
  const token = new AccessToken(TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET);

  token.identity = identity;
  token.addGrant(grant);

  return token;
}

function createRoom(identity) {
  logger.debug('createRoom', identity);
  return client.video.rooms.create({
    recordParticipantsOnConnect: true,
    enableTurn: true,
    statusCallback: '',
    type: 'group-small',
    uniqueName: identity,
  });
}

function getRoom(identity) {
  logger.debug('getRoom', identity);
  // return new Promise((resolve) => {
  //   client.video.rooms.each({ uniqueName: identity }, resolve);
  // });
  // return client.video.rooms(identity).fetch().then(logger.debug).catch(console.error);
  return client.video.rooms.list().then((rooms = []) => rooms.find(r => r.uniqueName === identity));
}

function ensureRoom(identity) {
  return getRoom(identity).then(room => room || createRoom(identity));
}

exports.getToken = getToken;
exports.createRoom = createRoom;
exports.getRoom = getRoom;
exports.ensureRoom = ensureRoom;
