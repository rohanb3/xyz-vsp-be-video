class CallUpdateError extends Error {
  constructor(messages = []) {
    super('Update failed');
    this.name = 'CallUpdateError';
    this.messages = messages;

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = (new Error('Update failed')).stack;
    }
  }
}

exports.CallUpdateError = CallUpdateError;
