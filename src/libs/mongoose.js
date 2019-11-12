const mongoose = require('mongoose');
const beautifyUnique = require('mongoose-beautiful-unique-validation');
const config = require('config');

const { connectionString, dbName, debug } = config.get('mongoose');

mongoose.Promise = Promise;

mongoose.plugin(beautifyUnique);
mongoose.set('debug', debug);
mongoose.set('useFindAndModify', false);

mongoose.plugin(schema => {
  if (!schema.options.toObject) {
    schema.options.toObject = {};
  }

  if (schema.options.toObject.transform === undefined) {
    schema.options.toObject.transform = (doc, ret) => {
      delete ret.__v;
      return ret;
    };
  }
});

mongoose.connect(connectionString, {
  keepAlive: 1,
  poolSize: 15,
  useNewUrlParser: true,
  dbName,
  reconnectTries: Number.MAX_VALUE,
  reconnectInterval: 500,
});

module.exports = mongoose;
