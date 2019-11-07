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

function formattedTimestamp() {
  return moment.utc().format();
}

exports.getDifferenceFromTo = getDifferenceFromTo;
exports.formatTimeToFilter = formatTimeToFilter;
exports.formattedTimestamp = formattedTimestamp;
