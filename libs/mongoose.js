const mongoose = require('mongoose');
const beautifyUnique = require('mongoose-beautiful-unique-validation');

const MONGO_URI = 'mongodb://8be6cefd-0ee0-4-231-b9ee:YLo7SWYwiDXb5RTeHJ8cI6UdEL9ZKa8r1SroQpTs1OiZSMsjWwA6LkZsVYkRNVLmslVLWDxsST7dqkK8QCfa0Q%3D%3D@8be6cefd-0ee0-4-231-b9ee.documents.azure.com:10255/?ssl=true';

mongoose.Promise = Promise;


mongoose.plugin(beautifyUnique);
mongoose.set('debug', true);

mongoose.plugin((schema) => {
  if (!schema.options.toObject) {
    schema.options.toObject = {};
  }

  if (schema.options.toObject.transform === undefined) {
    schema.options.toObject.transform = (doc, ret) => { delete ret.__v; return ret; };
  }
});

mongoose.connect(MONGO_URI, {
  server: {
    socketOptions: {
      keepAlive: 1,
    },
    poolSize: 5,
  },
});

module.exports = mongoose;
