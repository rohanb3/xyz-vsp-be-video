exports.modelObjectToJSON = (modelObj = {}) =>
  modelObj.toJSON ? modelObj.toJSON() : JSON.stringify(modelObj);
