const router = require('express').Router();

const callFeedbackCustomer = require('@/routes/callFeedbackCustomer');
const callFeedbackOperator = require('@/routes/callFeedbackOperator');
const { getCalls, getCallsValidationArray } = require('@/routes/calls');
const {
  getActiveCallSalesRep,
  getActiveCallSalesRepValidationArray,
} = require('@/routes/activeCallSalesRep');
const {
  setupSwagger,
  validateRequest,
  authenticateRequest,
} = require('@/routes/utils');

setupSwagger(router);

router.post('/call-feedback-customer', callFeedbackCustomer);
router.post('/call-feedback-operator', callFeedbackOperator);

router
  .route('/calls')
  .get(authenticateRequest())
  .get(validateRequest(getCallsValidationArray()))
  .get(getCalls);

router
  .route('/active-call-salesrep')
  .get(validateRequest(getActiveCallSalesRepValidationArray()))
  .get(getActiveCallSalesRep);

module.exports = router;
