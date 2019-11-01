const twilio = require('twilio');
const config = require('config');
const logger = require('@/services/logger')(module);
const { isNumber, getParams } = require('@/services/voiceCalls/utils');

function tokenGenerator(request, response) {
  const { identity } = getParams(request);

  if (!identity) {
    return response.status(400).send('Identity is required');
  }

  const { accountSid, apiKey, apiSecret, voiceCallTwimlAppSid } = config.get(
    'twilio'
  );

  const { AccessToken } = twilio.jwt;
  const { VoiceGrant } = AccessToken;
  const token = new AccessToken(accountSid, apiKey, apiSecret);
  token.addGrant(
    new VoiceGrant({
      outgoingApplicationSid: voiceCallTwimlAppSid,
    })
  );
  token.identity = identity;
  return response.send(token.toJwt());
}

function makeCall(request, response) {
  const { to, from } = getParams(request);

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
