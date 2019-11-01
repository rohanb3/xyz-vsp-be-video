function isNumber(number) {
  if (!number) {
    return false;
  }

  if (number.length == 1) {
    if (!isNaN(number)) {
      return true;
    }
  } else if (String(number).charAt(0) == '+') {
    number = number.substring(1);
    if (!isNaN(number)) {
      return true;
    }
  } else {
    if (!isNaN(number)) {
      return true;
    }
  }
  return false;
}

function getParams(request) {
  const params = request.method == 'POST' ? request.body : request.query;
  return { ...params };
}

exports.isNumber = isNumber;
exports.getParams = getParams;
