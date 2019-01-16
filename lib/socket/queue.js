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

  removeByRequesterId(id) {
    console.log('removeByRequesterId');
    console.log(id, this.queue);
    const index = this.queue.findIndex(call => call.requestedBy === id);
    if (index >= 0) {
      return this.queue.splice(index, 1);
    }
    return null;
  }

  removeByAcceptorId(id) {
    console.log('removeByAcceptorId');
    console.log(id, this.queue);
    const index = this.queue.findIndex(call => call.acceptedBy === id);
    if (index >= 0) {
      return this.queue.splice(index, 1);
    }
    return null;
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
