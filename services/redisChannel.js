const redis = require('redis');

const { REDIS_HOST, REDIS_PORT } = require('../constants/redis');

const MESSAGE = 'message';

class RedisChannel {
  constructor(options = {}) {
    const {
      port = REDIS_PORT,
      host = REDIS_HOST,
      name,
      serializer,
    } = options;

    this.name = name;
    this.serializer = serializer;
    this.eventsListeners = {};
    this.pub = redis.createClient(port, host);
    this.sub = redis.createClient(port, host);
    this.sub.on(MESSAGE, this._handleMessage.bind(this));
    this.sub.subscribe(this.name);
  }

  subscribe(eventName, listener) {
    if (!this.eventsListeners[eventName]) {
      this.eventsListeners[eventName] = [];
    }
    this.eventsListeners[eventName].push(listener);

    return () => this.unsubscribe(eventName, listener);
  }

  unsubscribe(eventName, listener) {
    const listeners = this.eventsListeners[eventName];
    if (listeners && listeners.length) {
      this.eventsListeners[eventName] = listeners.filter(l => l !== listener);
    }
  }

  publish(eventName, data) {
    const message = this._serialize({ eventName, data });
    this.pub.publish(this.name, message);
  }

  closeChannel() {
    this.pub.quit();
    this.sub.quit();
  }

  // private methods

  _handleMessage(channel, message) {
    if (channel === this.name) {
      const { eventName, data } = this._deserialize(message);
      const listeners = this.eventsListeners[eventName] || [];
      listeners.forEach(listener => listener(data));
    }
  }

  _serialize(value) {
    return this.serializer.serialize(value);
  }

  _deserialize(string) {
    return this.serializer.deserialize(string);
  }
}

const createRedisChannel = options => new RedisChannel(options);

exports.createRedisChannel = createRedisChannel;
