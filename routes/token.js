const AccessToken = require('twilio').jwt.AccessToken;
const randomname = require('../utils/randomname');

const VideoGrant = AccessToken.VideoGrant;

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
} = process.env;

module.exports = (request, response) => {
  const { identity = randomname() } = request.params;
  const grant = new VideoGrant();
  const token = new AccessToken(
    TWILIO_ACCOUNT_SID,
    TWILIO_API_KEY,
    TWILIO_API_SECRET
  );

  token.identity = identity;
  token.addGrant(grant);

  response.send({
    identity,
    token: token.toJwt()
  });
}
