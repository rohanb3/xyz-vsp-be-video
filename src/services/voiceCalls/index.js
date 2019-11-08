const twilio = require('twilio');
const config = require('config');
const logger = require('@/services/logger')(module);
const { isNumber, getParams } = require('@/services/voiceCalls/utils');
const { formattedTimestamp } = require('@/services/time');
const { callTypes } = require('@/constants/calls');
const finisher = require('./finisher');
const callsDBClient = require('../calls/DBClient');

function tokenGenerator(identity) {
  if (!identity) {
    throw new Error('Identity is required');
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
  return token.toJwt();
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

async function requestCall({
  callId,
  salesRepId,
  requestedBy,
  deviceId,
  from,
  to,
}) {
  const call = {
    requestedBy,
    requestedAt: formattedTimestamp(),
    deviceId,
    salesRepId,
    callType: callTypes.AUDIO,
    roomId: callId,
  };

  const token = tokenGenerator(from);

  return callsDBClient.create(call).then(savedCall => ({
    token,
    from,
    to,
    callId: savedCall.id,
  }));
}

function finishCall(id, finishedBy) {
  if (!id) {
    return Promise.reject();
  }

  return finisher.markCallAsFinished(id, finishedBy);
}

function startCall(id, data) {
  if (!id) {
    return Promise.reject();
  }

  const updates = {
    ...data,
    startedAt: formattedTimestamp(),
  };

  return callsDBClient.updateById(id, updates);
}

exports.makeCall = makeCall;
exports.requestCall = requestCall;
exports.finishCall = finishCall;
exports.startCall = startCall;
