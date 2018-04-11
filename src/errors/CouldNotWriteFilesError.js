const { generateMessageFromErrorPayload } = require('../util')

module.exports = class CouldNotPublishFilesError extends Error {
  constructor(errorPayload) {
    super()
    this.message = `Some files could not be written:\n ${generateMessageFromErrorPayload(errorPayload)}`
    this.shortMessage = 'XPort: Could not write one or more files. Check your XPort\'s output for more details.';
  }
};
