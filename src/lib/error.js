const generateMessageFromErrorPayload = errorPayload => {
  return errorPayload.map(itemError => {
    let message = ` Item: ${itemError.name} `
    let { error, errors, stack } = itemError

    if (error) {
      message = `${message} \n  Error: ${error.message}${error.origin? `\n > ${error.origin.message}` : ''}\n`
    }

    if (errors) {
      message = `${message} \n  Errors: ${errors.map((error, index) => {
        return `\n   [${index}] ${error.message}${error.origin? `\n > ${error.origin.message}` : ''}`
      }).join(' ')}\n`
    }

    if (stack) {
      message = `${message}\n Response stack: ${stack}\n`
    }

    return message
  }).join('\n')
};

module.exports = { generateMessageFromErrorPayload };
