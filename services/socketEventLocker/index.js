/* eslint-disable no-use-before-define */
const client = require('./client');

const checkAndLock = (key, value, duration = 0) => client
  .check(key, value)
  .then(isExist => (isExist ? false : client.add(key, value)))
  .then((res) => {
    const isFirst = Boolean(res);
    const unlockAfter = Number(duration);
    if (isFirst && unlockAfter) {
      checkAndUnlock(key, value, unlockAfter);
    }
    return isFirst;
  });

const checkAndUnlock = (key, value, unlockAfter = 0) => client
  .check(key, value)
  .then(isExist => isExist && createUnlockingPromise(key, value, unlockAfter))
  .then(Boolean);

const createUnlockingPromise = (key, value, unlockAfter = 0) => (
  new Promise((resolve, reject) => {
    setTimeout(() => {
      client.remove(key, value)
        .then(resolve)
        .catch(reject);
    }, Number(unlockAfter));
  })
);

exports.checkAndLock = checkAndLock;
exports.checkAndUnlock = checkAndUnlock;
