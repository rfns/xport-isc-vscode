const fetch = require('isomorphic-fetch');

const { HttpRequestError } = require('../errors');

const prepareOptionsAndPayload = (method, requestHeaders, body) => Object.assign({
  method,
  body: JSON.stringify(body),
  credentials: 'same-origin',
  headers: Object.assign({}, requestHeaders, {
    'Content-Type': 'application/json; charset=utf-8'
  })
});

const fetchJSON = (url, data) => fetch(url, data).then(response => {
  return Promise.all([ response.status, response.json() ])
}).then(data => {
  let [ status, response ] = data;
  let errorMessage = response;

  if (status < 301) {
    return Promise.resolve(response);
  }

  if (response.error) errorMessage = response.error.message;
  return Promise.reject(new HttpRequestError(errorMessage, status));
});

module.exports = {
  prepareOptionsAndPayload,
  fetchJSON
};
