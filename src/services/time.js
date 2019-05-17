const moment = require('moment');

function getDifferenceFromTo(from, to) {
  return moment(to).diff(moment(from), 's');
}

function formatTimeToFilter(time) {
  return time
    ? moment(time)
        .utc()
        .format()
    : null;
}

exports.getDifferenceFromTo = getDifferenceFromTo;
exports.formatTimeToFilter = formatTimeToFilter;
