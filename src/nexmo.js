const Nexmo = require('nexmo');
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

  const createCall = nexmo.calls.create(
    {
      to: [{ type: 'phone', number: '15626447621' }],
      from: { type: 'phone', number: '15626447621' },
      ncco,
    },
    //(err, result) => {
      //console.log(err || result);
    //},
  );

  function getEvent(request, response) {
    //console.log(request);
    return response;
  }
  
  function getAnswer(request, response) {
   // console.log(request);
    return response;
  }
  
  exports.getEvent = getEvent;
  exports.getAnswer = getAnswer;
  exports.createCall = createCall;