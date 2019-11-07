const router = require('express').Router();

const callFeedbackCustomer = require('@/routes/callFeedbackCustomer');
const callFeedbackOperator = require('@/routes/callFeedbackOperator');
const { getCalls, getCallsValidationArray } = require('@/routes/calls');
const { getActiveCallSalesRep } = require('@/routes/activeCallSalesRep');
const {
  setupSwagger,
  validateRequest,
  authenticateRequest,
} = require('@/routes/utils');
const { makeCall } = require('@/services/voiceCalls');

setupSwagger(router);

router.post('/call-feedback-customer', callFeedbackCustomer);
router.post('/call-feedback-operator', callFeedbackOperator);

router
  .route('/calls')
  .get(authenticateRequest())
  .get(validateRequest(getCallsValidationArray()))
  .get(getCalls);

router.route('/active-call-salesrep/:operatorId').get(getActiveCallSalesRep);

router.get('/makeCall', makeCall);
router.post('/makeCall', makeCall);

//////////// Nexmo calls
const { getEvent, getAnswer, startCall, endCall } = require('./nexmo');
router.get('/nexmo/testcall/:from-:to', startCall);
router.get('/nexmo/answer', getAnswer);
router.post('/nexmo/event', getEvent);
router.get('/nexmo/endcall/:callid', endCall);
///////////

module.exports = router;
