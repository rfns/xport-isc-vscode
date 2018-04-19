const { generateMessageFromErrorPayload } = require('../lib/error')

module.exports = class CouldNotRemoveItemsError extends Error {
  constructor(errorOnRemove) {
    super()
    this.message = `Some files could not be removed from the project:\n ${generateMessageFromErrorPayload(errorOnRemove)}`
    this.shortMessage = 'Could not remove one or more files. Check your XPort\'s output for more details.';
  }
};
