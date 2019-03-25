const router = require('express').Router();
const swaggerUi = require('swagger-ui-express');

const callFeedbackCustomer = require('@/routes/callFeedbackCustomer');
const callFeedbackOperator = require('@/routes/callFeedbackOperator');
const swaggerDocument = require('@/swagger/v1');

router.post('/call-feedback-customer', callFeedbackCustomer);
router.post('/call-feedback-operator', callFeedbackOperator);
router.use('/swagger', swaggerUi.serve);
router.get('/swagger', swaggerUi.setup(swaggerDocument));

module.exports = router;
