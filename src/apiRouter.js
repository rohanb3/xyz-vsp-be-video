const router = require('express').Router();

const {
  GET_DASHBOARD_PERMISSION,
  DASHBOARD_CHOOSE_TENANT_PERMISSION,
} = require('@/constants/permissions');
const callFeedbackCustomer = require('@/routes/callFeedbackCustomer');
const { getVersion } = require('@/routes/version');
const { getDurations, getCallbacks } = require('@/routes/dashboard');
const callFeedbackOperator = require('@/routes/callFeedbackOperator');
const { getCalls, getCallsValidationArray } = require('@/routes/calls');
const { getActiveCallSalesRep } = require('@/routes/activeCallSalesRep');
const {
  setupSwagger,
  validateRequest,
  authenticateRequest,
  protectWithPermission,
} = require('@/routes/utils');
const { makeCall } = require('@/services/voiceCalls');
const { validateTenantFilter } = require('@/services/filtersValidator');

setupSwagger(router);

router.route('/version').get(getVersion);

router
  .route('/dashboard/durations')
  .get(authenticateRequest())
  .get(protectWithPermission(GET_DASHBOARD_PERMISSION))
  .get(validateTenantFilter(DASHBOARD_CHOOSE_TENANT_PERMISSION))
  .get(getDurations);

router
  .route('/dashboard/callbacks')
  .get(authenticateRequest())
  .get(protectWithPermission(GET_DASHBOARD_PERMISSION))
  .get(validateTenantFilter(DASHBOARD_CHOOSE_TENANT_PERMISSION))
  .get(getCallbacks);

router
  .route('/call-feedback-customer')
  .post(authenticateRequest())
  .post(callFeedbackCustomer);
router
  .route('/call-feedback-operator')
  .post(authenticateRequest())
  .post(callFeedbackOperator);

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
  .post(authenticateRequest())
  .post(getEvent);
router
  .route('/nexmo/endcall/:callid')
  .get(authenticateRequest())
  .get(endCall);
///////////

module.exports = router;
