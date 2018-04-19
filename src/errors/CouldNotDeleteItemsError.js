const { generateMessageFromErrorPayload } = require('../lib/error')

module.exports = class CouldNotDeleteItemsError extends Error {
  constructor(errorOnDelete) {
    super();
    this.message = `Some files could not be deleted from the server:\n ${generateMessageFromErrorPayload(errorOnDelete)}`
    this.shortMessage = 'Could not delete one or more files. Check your XPort\'s output for more details.';
    this.itemsNotDeleted = errorOnDelete.map(fileError => fileError.path)
  }
};
