const MongoClient = require('../components/clients/MongoClient');

const createCallsDBClient = model => new MongoClient(model);

exports.createCallsDBClient = createCallsDBClient;
