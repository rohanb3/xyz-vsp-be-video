const cors = require('cors');

exports.init = app => app.use(cors({ origin: true }));
