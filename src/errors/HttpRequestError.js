module.exports = class HttpRequestError extends Error {
  constructor(msg = 'Not Found', httpStatus = 404) {
    let shortMessage = `${msg} [Status: ${httpStatus}]`;

    super();
    this.message = `${msg}`;
    this.shortMessage = shortMessage;
    this.name = 'HttpRequestError';
  }
};
