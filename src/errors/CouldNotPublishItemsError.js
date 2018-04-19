const { generateMessageFromErrorPayload } = require('../lib/error')

module.exports = class CouldNotPublishFilesError extends Error {
  constructor (errorOnPublish) {
    super()
    this.message = `Some files could not be published to the server:\n${generateMessageFromErrorPayload(errorOnPublish)}`
    this.shortMessage = 'Could not publish one or more files. Check your XPort\'s output for more details.';
  }
};
