const convertToHashWithPrefixedValues = (names = [], prefix = '') => names
  .reduce((acc, name) => {
    const prefixedName = prefix ? `${prefix}.${name}` : name;
    acc[name] = prefixedName;
    return acc;
  }, {});

exports.convertToHashWithPrefixedValues = convertToHashWithPrefixedValues;
