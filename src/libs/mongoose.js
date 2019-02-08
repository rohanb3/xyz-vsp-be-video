const mongoose = require('mongoose');
const beautifyUnique = require('mongoose-beautiful-unique-validation');

const { MONGO_URI } = process.env;

mongoose.Promise = Promise;


mongoose.plugin(beautifyUnique);
mongoose.set('debug', process.env.NODE_ENV !== 'production');
mongoose.set('useFindAndModify', false);

mongoose.plugin((schema) => {
  if (!schema.options.toObject) {
    schema.options.toObject = {};
  }

  if (schema.options.toObject.transform === undefined) {
    schema.options.toObject.transform = (doc, ret) => { delete ret.__v; return ret; };
  }
});

mongoose.connect(MONGO_URI, {
  keepAlive: 1,
  poolSize: 5,
  useNewUrlParser: true,
  dbName: 'twilio',
});

module.exports = mongoose;
