const Queue = require('./Queue');

const CALL_ACCEPTED = 'CALL_ACCEPTED';

class PendingCallsQueue extends Queue {
  constructor(options) {
    super(options);
    this.addEventsNames([CALL_ACCEPTED]);
  }

  acceptCall(call) {
    return Promise.resolve()
      .then(() => this.emitCallAccepting(call));
  }

  subscribeToCallAccepting(listener) {
    return this.events.subscribe(CALL_ACCEPTED, listener);
  }

  unsubscribeFromCallAccepting(listener) {
    return this.events.unsubscribe(CALL_ACCEPTED, listener);
  }

  emitCallAccepting(call) {
    return this.events.emit(CALL_ACCEPTED, call);
  }
}

module.exports = PendingCallsQueue;
