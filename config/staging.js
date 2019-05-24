const { REDIS_PASSWORD } = process.env;

module.exports = {
  redis: {
    authRequired: true,
    password: REDIS_PASSWORD,
  },
  session: {
    setProxy: true,
  },
};
