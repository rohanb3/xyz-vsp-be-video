class NotFoundItemError extends Error {
  constructor(id) {
    const message = `Item with ${id} id not found in storage`;
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
    const message = `Item with ${id} already exists in storage`;
    super(message);
    this.name = 'OverrideItemError';

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = (new Error(message)).stack;
    }
  }
}

exports.NotFoundItemError = NotFoundItemError;
exports.OverrideItemError = OverrideItemError;
