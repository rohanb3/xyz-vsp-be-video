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
router
  .route('/nexmo/testcall/:from-:to')
  .get(authenticateRequest())
  .get(startCall);
router
  .route('/nexmo/answer')
  .get(authenticateRequest())
  .get(getAnswer);
router
  .route('/nexmo/event')
  .get(authenticateRequest())
  .post(getEvent);
router
  .route('/nexmo/endcall/:callid')
  .get(authenticateRequest())
  .get(endCall);
///////////

module.exports = router;
