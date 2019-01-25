class MongoClient {
  constructor(model) {
    this.model = model;
  }

  create(entity) {
    return this.model.create(entity);
  }

  update(id, updates = {}) {
    return this.model.findByIdAndUpdate(id, { $set: updates });
  }
}

module.exports = MongoClient;
