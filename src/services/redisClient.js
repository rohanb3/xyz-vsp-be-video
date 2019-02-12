const redis = require('redis');

const { REDIS_HOST, REDIS_PORT } = require('@/constants/redis');
const { promiser } = require('@/services/redisUtils');

const client = redis.createClient(REDIS_PORT, REDIS_HOST);

/*
** Unordered sets start
*/

const sismember = (...args) => new Promise((resolve, reject) => (
  client.sismember(...args, promiser(resolve, reject))
));

const sadd = (...args) => new Promise((resolve, reject) => (
  client.sadd(...args, promiser(resolve, reject))
));

const srem = (...args) => new Promise((resolve, reject) => (
  client.srem(...args, promiser(resolve, reject))
));

const scard = (...args) => new Promise((resolve, reject) => (
  client.scard(...args, promiser(resolve, reject))
));

/*
** Unordered sets finish
*/

/*
** Lists start
*/

const lrange = (...args) => new Promise((resolve, reject) => (
  client.lrange(...args, promiser(resolve, reject))
));

const lpush = (...args) => new Promise((resolve, reject) => (
  client.lpush(...args, promiser(resolve, reject))
));

const rpop = (...args) => new Promise((resolve, reject) => (
  client.rpop(...args, promiser(resolve, reject))
));

const lrem = (...args) => new Promise((resolve, reject) => (
  client.lrem(...args, promiser(resolve, reject))
));

const llen = (...args) => new Promise((resolve, reject) => (
  client.llen(...args, promiser(resolve, reject))
));

/*
** Lists finish
*/

/*
** Hashes start
*/

const hgetall = (...args) => new Promise((resolve, reject) => (
  client.hgetall(...args, promiser(resolve, reject))
));

const hmset = (...args) => new Promise((resolve, reject) => (
  client.hmset(...args, promiser(resolve, reject))
));


/*
** Hashes finish
*/

/*
** General start
*/

const del = (...args) => new Promise((resolve, reject) => (
  client.del(...args, promiser(resolve, reject))
));

/*
** General finish
*/

exports.sismember = sismember;
exports.sadd = sadd;
exports.srem = srem;
exports.scard = scard;

exports.lrange = lrange;
exports.lpush = lpush;
exports.rpop = rpop;
exports.lrem = lrem;
exports.llen = llen;

exports.hgetall = hgetall;
exports.hmset = hmset;

exports.del = del;
