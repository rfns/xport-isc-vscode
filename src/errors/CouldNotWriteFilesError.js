const { generateMessageFromErrorPayload } = require('../lib/error')

module.exports = class CouldNotPublishFilesError extends Error {
  constructor(errorPayload) {
    super()
    this.message = `Some files could not be written:\n ${generateMessageFromErrorPayload(errorPayload)}`
    this.shortMessage = 'Could not write one or more files. Check your XPort\'s output for more details.';
  }
};
