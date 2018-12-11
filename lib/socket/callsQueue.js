export default class CallsQueue {
  constructor() {
    this.queue = [];
  }

  get size() {
    return this.queue.length;
  }

  prepend(call) {
    return this.queue.unshift(call);
  }
}
