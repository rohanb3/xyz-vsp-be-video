class NotFoundItemError extends Error {
  constructor(id) {
    const message = `Item with ${id} id not found in queue`;
    super(message);
    this.name = 'NotFoundItemError';

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = (new Error(message)).stack;
    }
  }
}

class OverrideItemError extends Error {
  constructor(id) {
    const message = `Item with ${id} already exists in queue`;
    super(message);
    this.name = 'OverrideItemError';

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = (new Error(message)).stack;
    }
  }
}

class EmptyQueueError extends Error {
  constructor() {
    const message = 'Queue is empty';
    super(message);
    this.name = 'EmptyQueueError';

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = (new Error(message)).stack;
    }
  }
}

exports.NotFoundItemError = NotFoundItemError;
exports.OverrideItemError = OverrideItemError;
exports.EmptyQueueError = EmptyQueueError;
