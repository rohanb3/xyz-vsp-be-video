/* eslint-disable no-use-before-define */
const redis = require('redis');

const { REDIS_HOST, REDIS_PORT } = require('../../constants/redis');
const { serialize, deserialize } = require('../serializer');

const { QUEUE_NAME, MESSAGE } = require('./constants');

const eventsListeners = {};
const pub = redis.createClient(REDIS_PORT, REDIS_HOST);
const sub = redis.createClient(REDIS_PORT, REDIS_HOST);

const subscribe = (eventName, listener) => {
  if (!eventsListeners[eventName]) {
    eventsListeners[eventName] = [];
  }
  eventsListeners[eventName].push(listener);

  return () => unsubscribe(eventName, listener);
};

const unsubscribe = (eventName, listener) => {
  const listeners = eventsListeners[eventName];
  if (listeners && listeners.length) {
    eventsListeners[eventName] = listeners.filter(l => l !== listener);
  }
};

const publish = (eventName, data) => {
  const message = serialize({ eventName, data });
  pub.publish(QUEUE_NAME, message);
};

const closeChannel = () => {
  pub.quit();
  sub.quit();
};

const handleMessage = (channel, message) => {
  if (channel === QUEUE_NAME) {
    const { eventName, data } = deserialize(message);
    const listeners = eventsListeners[eventName] || [];
    listeners.forEach(listener => listener(data));
  }
};

sub.on(MESSAGE, handleMessage);
sub.subscribe(QUEUE_NAME);

exports.subscribe = subscribe;
exports.unsubscribe = unsubscribe;
exports.publish = publish;
exports.closeChannel = closeChannel;
