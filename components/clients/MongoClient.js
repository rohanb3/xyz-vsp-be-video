class MongoClient {
  constructor(model) {
    this.model = model;
  }

  getById(id) {
    return this.model.findById(id);
  }

  create(entity) {
    return this.model.create(entity);
  }

  updateById(id, updates = {}) {
    return this.model.findOneAndUpdate({ _id: id }, { $set: updates });
  }

  updateByQuery(query, updates = {}) {
    return this.model.findOneAndUpdate(query, { $set: updates });
  }
}

module.exports = MongoClient;
