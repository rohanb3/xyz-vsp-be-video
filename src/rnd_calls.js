const __RND_TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const __RND_TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const __RND_TWILIO_API_KEY = process.env.TWILIO_API_KEY;
const __RND_TWILIO_API_SECRET = process.env.TWILIO_API_SECRET;
const __RND_TWILIO_APP_SID = process.env.TWILIO_VOICE_CALL_TWIML_APP_SID;
const __RND_TWILIO_CALL_CENTER_NUMBER = process.env.TWILIO_CALL_CENTER_NUMBER;

const AccessToken = (require('twilio').jwt || {}).AccessToken;
const VoiceGrant = (AccessToken || {}).VoiceGrant;
const VoiceResponse = (require('twilio').twiml || {}).VoiceResponse;

const logger = require('@/services/logger')(module);

function isNumber(to) {
  if (!to) {
    return false;
  }

  if (to.length == 1) {
    if (!isNaN(to)) {
      logger.debug('It is a 1 digit long number' + to);
      return true;
    }
  } else if (String(to).charAt(0) == '+') {
    number = to.substring(1);
    if (!isNaN(number)) {
      logger.debug('It is a number ' + to);
      return true;
    }
  } else {
    if (!isNaN(to)) {
      logger.debug('It is a number ' + to);
      return true;
    }
  }
  logger.debug('not a number');
  return false;
}

function tokenGenerator(request, response) {
  // Parse the identity from the http request
  var identity = null;
  if (request.method == 'POST') {
    identity = request.body.identity;
  } else {
    identity = request.query.identity;
  }

  if (!identity) {
    return response.status(400).send('Identity is required');
  }

  // Used when generating any kind of tokens
  const accountSid = __RND_TWILIO_ACCOUNT_SID;
  const apiKey = __RND_TWILIO_API_KEY;
  const apiSecret = __RND_TWILIO_API_SECRET;

  // Used specifically for creating Voice tokens
  // const pushCredSid = process.env.PUSH_CREDENTIAL_SID;
  const outgoingApplicationSid = __RND_TWILIO_APP_SID;

  // Create an access token which we will sign and return to the client,
  // containing the grant we just created
  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: outgoingApplicationSid,
    // pushCredentialSid: pushCredSid
  });

  // Create an access token which we will sign and return to the client,
  // containing the grant we just created
  const token = new AccessToken(accountSid, apiKey, apiSecret);
  token.addGrant(voiceGrant);
  token.identity = identity;
  return response.send(token.toJwt());
}

function makeCall(request, response) {
  console.log(request);
  logger.debug('makeCall', request.body, request.query, request.headers);
  // The recipient of the call, a phone number or a client
  var to = __RND_TWILIO_CALL_CENTER_NUMBER;
  var from;

  if (request.method == 'POST') {
    from = request.body.from;
  } else {
    from = request.query.from;
  }

  const voiceResponse = new VoiceResponse();

  if (isNumber(from)) {
    const dial = voiceResponse.dial({ callerId: from });
    dial.number(to);
  } else {
    voiceResponse.say(
      'Congratulations! You have made your first call! Good bye.'
    );
  }
  return response.send(voiceResponse.toString());
}

exports.tokenGenerator = tokenGenerator;
exports.makeCall = makeCall;
