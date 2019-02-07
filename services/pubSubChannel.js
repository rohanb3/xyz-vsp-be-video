/* eslint-disable no-use-before-define */
const redis = require('redis');

const { REDIS_HOST, REDIS_PORT } = require('@/constants/redis');
const { serialize, deserialize } = require('@/services/serializer');
const { APP_NAME } = require('@/constants/app');

const CHANNEL_NAME = `${APP_NAME}.pub-sub-channel`;

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

// class RedisChannel {
//   constructor(channelName) {
//     this.channelName = channelName;
//     this.eventsListeners = {};
//     this.pub = redis.createClient(REDIS_PORT, REDIS_HOST);
//     this.sub = redis.createClient(REDIS_PORT, REDIS_HOST);
//
//     this.subscribe = this.subscribe.bind(this);
//     this.unsubscribe = this.unsubscribe.bind(this);
//     this.publish = this.publish.bind(this);
//     this.closeChannel = this.closeChannel.bind(this);
//     this.handleMessage = this.handleMessage.bind(this);
//
//     this.sub.on('message', this.handleMessage.bind(this));
//     this.sub.subscribe(this.channelName);
//   }
//
//   subscribe(eventName, listener) {
//     if (!this.eventsListeners[eventName]) {
//       this.eventsListeners[eventName] = [];
//     }
//     this.eventsListeners[eventName].push(listener);
//
//     return () => this.unsubscribe(eventName, listener);
//   }
//
//   unsubscribe(eventName, listener) {
//     const listeners = this.eventsListeners[eventName];
//     if (listeners && listeners.length) {
//       this.eventsListeners[eventName] = listeners.filter(l => l !== listener);
//     }
//   }
//
//   publish(eventName, data) {
//     const message = serialize({ eventName, data });
//     this.pub.publish(this.channelName, message);
//   }
//
//   closeChannel() {
//     this.pub.quit();
//     this.sub.quit();
//   }
//
//   handleMessage(channel, message) {
//     if (channel === this.channelName) {
//       const { eventName, data } = deserialize(message);
//       const listeners = this.eventsListeners[eventName] || [];
//       listeners.forEach(listener => listener(data));
//     }
//   }
// }
//
// const createChannel = name => new RedisChannel(name);
//
// exports.createChannel = createChannel;
