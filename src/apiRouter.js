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

setupSwagger(router);

router.post('/call-feedback-customer', callFeedbackCustomer);
router.post('/call-feedback-operator', callFeedbackOperator);

router
  .route('/calls')
  .get(authenticateRequest())
  .get(validateRequest(getCallsValidationArray()))
  .get(getCalls);

router.route('/active-call-salesrep/:operatorId').get(getActiveCallSalesRep);

//////////// RND calls
const { makeCall, tokenGenerator } = require('./rnd_calls');
router.get('/accessToken', tokenGenerator);
router.post('/accessToken', tokenGenerator);
router.get('/makeCall', makeCall);
router.post('/makeCall', makeCall);
///////////

module.exports = router;
