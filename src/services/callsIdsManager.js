const mongoose = require('@/libs/mongoose');

const generateId = () => mongoose.Types.ObjectId().toString();

exports.generateId = generateId;
