// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const XPort = require('./src/XPort');

const { display } = require('./src/lib/output');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
  display('Checking the workspace for a valid configuration ...', 'root');

  let xportConfiguration = vscode.workspace.getConfiguration('xport');
  let xport = null;

  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(() => {
    xportConfiguration = vscode.workspace.getConfiguration('xport');
    setup(xportConfiguration);
  }));

  context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => {
    xport.cache.refresh();
  }));

  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => {
    xport.cache.refresh();
  }));

  const setup = settings => {
    if (!settings) {
      display('Extension is installed but on standby because no valid configuration has been found.', 'root');
      return;
    }

    if (!xport) {
      display(`Configuration found! The workspace '${vscode.workspace.name}' is integrated to the server.`, 'root');
      xport = new XPort();

      context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(e => xport.addToSaveQueue(e)));
      context.subscriptions.push(xport.createSyncCommand());
      // context.subscriptions.push(xport.createRemoveAndDeleteCommand());
      context.subscriptions.push(xport.createWatcherOnDeleteFile());
      context.subscriptions.push(xport.createWatcherOnNewFile());
      return xport.cache.refresh();
    }
  }
  setup(xportConfiguration);
}

exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}
exports.deactivate = deactivate;
