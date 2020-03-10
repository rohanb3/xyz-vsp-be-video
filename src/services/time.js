const moment = require('moment');

function getDifferenceFromTo(from, to) {
  return from && to ? moment(to).diff(moment(from), 's') : 0;
}

function formatTimeToFilter(time) {
  return time
    ? moment(time)
        .utc()
        .format()
    : null;
}

function formattedTimestamp() {
  return moment.utc().format();
}

exports.getDifferenceFromTo = getDifferenceFromTo;
exports.formatTimeToFilter = formatTimeToFilter;
exports.formattedTimestamp = formattedTimestamp;
