class CallUpdateError extends Error {
  constructor(messages = []) {
    super('Update failed');
    this.name = 'CallUpdateError';
    this.messages = messages;

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error('Update failed').stack;
    }
  }
}

class CallNotFoundError extends Error {
  constructor(id) {
    const message = `Call with ${id} id not found`;
    super(message);
    this.name = 'CallNotFoundError';

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error(message).stack;
    }
  }
}

class CallOverrideError extends Error {
  constructor(id) {
    const message = `Call with ${id} id already exists`;
    super(message);
    this.name = 'CallOverrideError';

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error(message).stack;
    }
  }
}

class CallsPendingEmptyError extends Error {
  constructor() {
    const message = 'Queue is empty';
    super(message);
    this.name = 'CallsPendingEmptyError';

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error(message).stack;
    }
  }
}

class PeerOfflineError extends Error {
  constructor() {
    const message = 'Peer offline';
    super(message);
    this.name = 'PeerOfflineError';

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error(message).stack;
    }
  }
}

exports.CallUpdateError = CallUpdateError;
exports.CallNotFoundError = CallNotFoundError;
exports.CallOverrideError = CallOverrideError;
exports.CallsPendingEmptyError = CallsPendingEmptyError;
exports.PeerOfflineError = PeerOfflineError;
