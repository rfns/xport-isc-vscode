module.exports = class HttpRequestError extends Error {
  constructor(msg = 'Not Found', httpStatus = 404) {
    let shortMessage = `XPort: ${msg} [Status: ${httpStatus}]`;

    super();
    this.message = `${msg}\n`;
    this.shortMessage = shortMessage;
    this.name = 'HttpRequestError';
  }
};
