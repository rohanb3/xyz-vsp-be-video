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

function getParam(request, paramName) {
  const params = request.method == 'POST' ? request.body : request.query;
  return params[paramName];
}

exports.isNumber = isNumber;
exports.getParam = getParam;
