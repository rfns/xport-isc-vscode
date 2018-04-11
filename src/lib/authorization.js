const withCredentials = (authentication, requestHeaders) => {
  let { username, password } = authentication;
  let credentials = `Basic ${new Buffer(`${username}:${password}`).toString('base64')}`

  Object.assign(requestHeaders, {
    Authorization: credentials
  });
}

module.exports = {
  withCredentials
};
