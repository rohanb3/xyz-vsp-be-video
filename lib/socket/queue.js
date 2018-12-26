module.exports = class Queue {
  constructor() {
    this.queue = [];
  }

  add(call) {
    this.queue.push(call);
  }

  getOldest() {
    const oldest = this.queue.shift();
    return oldest;
  }

  getByRequesterId(id) {
    return this.queue.find(call => call.requestedBy === id);
  }

  getByAcceptorId(id) {
    return this.queue.find(call => call.acceptedBy === id);
  }

  get size() {
    return this.queue.length;
  }
};
