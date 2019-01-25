const Queue = require('./Queue');

const ITEM_ACCEPTED = 'item.accepted';

class PendingCallsQueue extends Queue {
  constructor(options) {
    super(options);
    this.addEvents([ITEM_ACCEPTED]);
  }

  acceptCall(call) {
    return Promise.resolve()
      .then(() => this.emitCallAccepting(call));
  }

  subscribeToCallAccepting(listener) {
    return this.channel.subscribe(ITEM_ACCEPTED, listener);
  }

  unsubscribeFromCallAccepting(listener) {
    return this.channel.unsubscribe(ITEM_ACCEPTED, listener);
  }

  emitCallAccepting(call) {
    return this.channel.publish(ITEM_ACCEPTED, call);
  }
}

module.exports = PendingCallsQueue;
