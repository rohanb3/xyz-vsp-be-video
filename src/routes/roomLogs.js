module.exports = (request, response) => {
  console.log('room log accepted', request.url);
  response.send(200);
};
