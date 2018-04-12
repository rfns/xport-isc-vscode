const { window } = require('vscode');
const { getBasename, getCurrentFolder } = require('./workspace');

const output = window.createOutputChannel('XPort');
const currentFolderName = getBasename(getCurrentFolder());

const display = (message, folder = currentFolderName) =>
  output.appendLine(`[XPort] (${folder || 'root'}): ${message}`);

const showOutput = (preserveFocus) => output.show(preserveFocus);

module.exports = { display, showOutput, output };
