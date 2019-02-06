const promiser = (resolve, reject) => (err, data) => (err ? reject(err) : resolve(data));

exports.promiser = promiser;
