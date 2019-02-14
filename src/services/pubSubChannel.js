/* eslint-disable no-use-before-define */
const redis = require('redis');

const { REDIS_HOST, REDIS_PORT } = require('@/constants/redis');
const { serialize, deserialize } = require('@/services/serializer');

const CHANNEL_NAME = 'pub-sub-channel';

const pub = redis.createClient(REDIS_PORT, REDIS_HOST);
const sub = redis.createClient(REDIS_PORT, REDIS_HOST);
const eventsListeners = {};

sub.on('message', handleMessage);
sub.subscribe(CHANNEL_NAME);

function subscribe(eventName, listener) {
  if (!eventsListeners[eventName]) {
    eventsListeners[eventName] = [];
  }
  eventsListeners[eventName].push(listener);

  return () => unsubscribe(eventName, listener);
}

function unsubscribe(eventName, listener) {
  const listeners = eventsListeners[eventName];
  if (listeners && listeners.length) {
    eventsListeners[eventName] = listeners.filter(l => l !== listener);
  }
}

function publish(eventName, data) {
  const message = serialize({ eventName, data });
  pub.publish(CHANNEL_NAME, message);
}

function closeChannel() {
  pub.quit();
  sub.quit();
}

function handleMessage(channel, message) {
  if (channel === CHANNEL_NAME) {
    const { eventName, data } = deserialize(message);
    const listeners = eventsListeners[eventName] || [];
    listeners.forEach(listener => listener(data));
  }
}

exports.publish = publish;
exports.subscribe = subscribe;
exports.unsubscribe = unsubscribe;
exports.closeChannel = closeChannel;
