const EventEmitter = require('events');

export default class Events {
  constructor() {
    this.emitter = new EventEmitter();
  }

  subscribe(eventName, listener) {
    this.emitter.on(eventName, listener);
    return () => this.unsubscribe(eventName, listener);
  }

  unsubscribe(eventName, listener) {
    return this.emitter.off(eventName, listener);
  }

  emit(eventName, ...args) {
    this.emitter.emit(eventName, ...args);
  }
}
