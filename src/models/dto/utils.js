const lazyLoadDefault = {
  offset: 0,
  limit: 50,
};

function lazyLoadedData(data, count, range = lazyLoadDefault) {
  return {
    data,
    count,
    offset: range.offset,
    limit: range.limit,
  };
}

exports.lazyLoadDefault = lazyLoadDefault;
exports.lazyLoadedData = lazyLoadedData;
