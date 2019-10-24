const Nexmo = require('nexmo');
const logger = require('./services/logger')(module);
const { 
  NEXMO_API_KEY, 
  NEXMO_API_SECRET, 
  NEXMO_APPLICATION_ID, 
  NEXMO_PATH_TO_PRIVATE_KEY, } = require('./constants/nexmo');

const API_KEY = NEXMO_API_KEY;
const API_SECRET = NEXMO_API_SECRET;
const APPLICATION_ID = NEXMO_APPLICATION_ID;
const PATH_TO_PRIVATE_KEY = NEXMO_PATH_TO_PRIVATE_KEY;

const nexmo = new Nexmo({
  apiKey: API_KEY,
  apiSecret: API_SECRET,
  applicationId: APPLICATION_ID,
  privateKey: PATH_TO_PRIVATE_KEY,
});

const ncco = [
    {
      action: 'talk',
      voiceName: 'Joey',
      text:
        'This is a text-to-speech test message.',
    },
  ];

  const createCall = (request) => {
    const { to, from } = request.params;
    return new Promise((resolve) => {
      nexmo.calls.create(
        {
          to: [{ type: 'phone', number: to }],
          from: { type: 'phone', number: from},
          ncco,
        },
        (err, result) => {
          logger.debug(err || result);
          resolve(err || result);
        },
      );
    })
  }

  const endCall = (request) => {
    const { callid } = request.params;
    return new Promise((resolve) => {
      nexmo.calls.update(
        callid,
        {
          action: 'hangup'
        },
        (err, result) => {
          logger.debug(err || result);
          resolve(err || result);
        },
      );
    })
  }

  function getEvent(request, response) {
    logger.debug('NEXMO EVENT :', request.params);
    return response.status(200).send();
  }
  
  function getAnswer(request, response) {
    logger.debug('NEXMO ANSWER :', request.params);
    return response.status(200).send();
  }

  async function finishCall(request, response) {
    let result = await endCall(request);
    return response.status(200).send(result);
  }

  async function startCall(request, response) {
    let result = await createCall(request);
    return response.status(200).send(result);
  }


  exports.getEvent = getEvent;
  exports.getAnswer = getAnswer;
  exports.startCall = startCall;
  exports.endCall = finishCall;