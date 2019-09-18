const __RND_TWILIO_ACCOUNT_SID = 'ACd6afdd671e2355516d0c6fbcfd64a892';
const __RND_TWILIO_AUTH_TOKEN = '86527c4a67ebeb32835fa4868db48dd8';
const __RND_TWILIO_API_KEY = 'SK34e57d73eed4ad55dd1d0ac7f38e44c9';
const __RND_TWILIO_API_SECRET = 'RV8qBYA2lM0OY0oWsATsYYWkNXhXyzrO';
const __RND_TWILIO_APP_SID = 'AP409db1abd4a56913ffbbba86e075eea0';
const __RND_TWILIO_CALLER_NUMBER = '+12563803157';
const __RND_TWILIO_CALL_CENTER_NUMBER = '+380938821599';

const AccessToken = (require('twilio').jwt || {}).AccessToken;
const VoiceGrant = (AccessToken || {}).VoiceGrant;
const VoiceResponse = (require('twilio').twiml || {}).VoiceResponse;
const defaultIdentity = 'alice';
const callerId = 'client:quick_start';

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
    identity = defaultIdentity;
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
  logger.debug('makeCall', request.body, request.query);
  // The recipient of the call, a phone number or a client
  var to = __RND_TWILIO_CALL_CENTER_NUMBER;
  if (request.method == 'POST') {
    to = request.body.to;
  } else {
    to = request.query.to;
  }

  to = '380938821599';

  const voiceResponse = new VoiceResponse();

  if (!to) {
    voiceResponse.say(
      'Congratulations! You have made your first call! Good bye.'
    );
  } else if (isNumber(to)) {
    const dial = voiceResponse.dial({ callerId: __RND_TWILIO_CALLER_NUMBER });
    dial.number(to);
  } else {
    const dial = voiceResponse.dial({ callerId: callerId });
    dial.client(to);
  }
  console.log('Response:' + voiceResponse.toString());
  return response.send(voiceResponse.toString());
}

exports.tokenGenerator = tokenGenerator;
exports.makeCall = makeCall;
