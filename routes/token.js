const { getToken } = require('../services/twilio');
const randomname = require('../utils/randomname');

module.exports = (request, response) => {
  const { identity = randomname() } = request.params;
  const token = getToken(identity);

  response.send({
    identity,
    token: token.toJwt(),
  });
};
