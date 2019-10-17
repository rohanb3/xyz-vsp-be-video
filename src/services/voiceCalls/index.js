const twilio = require('twilio');
const config = require('config');
const logger = require('@/services/logger')(module);
const { isNumber, getParam } = require('@/services/voiceCalls/utils');

function tokenGenerator(request, response) {
  const identity = getParam(request, 'identity');

  if (!identity) {
    return response.status(400).send('Identity is required');
  }

  const { accountSid, apiKey, apiSecret, voiceCallTwimlAppSid } = config.get(
    'twilio'
  );

  const { AccessToken } = twilio.jwt;
  const { VoiceGrant } = AccessToken;
  const token = new tAccessToken(accountSid, apiKey, apiSecret);
  token.addGrant(
    new VoiceGrant({
      outgoingApplicationSid: voiceCallTwimlAppSid,
    })
  );
  token.identity = identity;
  return response.send(token.toJwt());
}

function makeCall(request, response) {
  const to = getParam(request, 'to');
  const from = getParam(request, 'from');

  logger.debug(`makeCall from:${from} to:${to}`);

  const canCall = isNumber(from) && isNumber(to);
  if (!canCall) {
    return response
      .status(400)
      .send('Some issues with required params (from, to)');
  }

  const { VoiceResponse } = twilio.twiml;
  const voiceResponse = new VoiceResponse();
  const dial = voiceResponse.dial({ callerId: from });
  dial.number(to);
  const resp = voiceResponse.toString();
  return response.send(resp);
}

exports.tokenGenerator = tokenGenerator;
exports.makeCall = makeCall;
