/* eslint-disable-next-line import/prefer-default-export */
export const convertArrayOfStringsToPrefixedHash = (prefix, names = []) => names
  .reduce((acc, name) => {
    const prefixedName = `${prefix}.${name}`;
    acc[name] = prefixedName;
    return acc;
  }, {});
