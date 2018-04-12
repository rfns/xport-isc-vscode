const { workspace, window } = require('vscode');
const XPort = require('./src/XPort');

const { display, output } = require('./src/lib/output');

function activate(context) {
  display('Checking the workspace for a valid configuration ...', 'root');

  let xportConfiguration = workspace.getConfiguration('xport');
  let xport = null;

  context.subscriptions.push(workspace.onDidChangeConfiguration(() => {
    xportConfiguration = workspace.getConfiguration('xport');
    setup(xportConfiguration);
  }));

  context.subscriptions.push(workspace.onDidChangeWorkspaceFolders(e => {
    // Do not attempt to use the cache because its instance is created along with the XPort.
    if (!xport) return;

    if (e.added.length) {
      display(`${e.added.length} folder(s) were added to the workspace.`, 'root');
      Promise.all(
        e.added.map(addedWorkspaceFolder =>
          xport.cache.build({ force: true, folder: addedWorkspaceFolder.uri.fsPath }).then(files => {
            display(`Cached ${files.length} file(s) from '${addedWorkspaceFolder.name}'.`, 'root');
          })
        )
      );
    }
    if (e.removed.length) {
      display(`${e.removed.length} folder(s) were removed from the workspace.`, 'root');
      Promise.all(
        e.removed.map(removedWorkspaceFolder => {
          const count = xport.cache.purge(removedWorkspaceFolder.name);
          display(`${count} file(s) that belonged to '${removedWorkspaceFolder.name}' were purged from the cache.`, 'root');
        })
      )
    }
  }));

  context.subscriptions.push(window.onDidChangeActiveTextEditor(e => {
    // File might be opened, but if no configuration is found, then no XPort instance should be available as well.
    if (!xport || e.document.uri.schema !== 'file') return;
!
    xport.cache.update([e.document.uri.fsPath], { skipPathExistsCheck: true });
  }));

  const setup = settings => {
    if (!settings) {
      display('Extension is installed but on standby because no valid configuration has been found.', 'root');
      return;
    }

    if (!xport) {
      display(`Configuration found! The workspace '${workspace.name}' is integrated to the server.`, 'root');
      xport = new XPort();

      context.subscriptions.push(workspace.onDidSaveTextDocument(e => xport.addToSaveQueue(e)));
      context.subscriptions.push(xport.createSyncCommand());
      // context.subscriptions.push(xport.createRemoveAndDeleteCommand());
      context.subscriptions.push(xport.createWatcherOnDeleteFile());
      context.subscriptions.push(xport.createWatcherOnNewFile());
      context.subscriptions.push(output);

      // This also includes newly added folders that couldn't be cached due to the XPort instance not being available.
      if (workspace.workspaceFolders && workspace.workspaceFolders.length) {
        display(`Found ${workspace.workspaceFolders.length} folder(s) in this workspace.`, 'root');
        Promise.all(
          workspace.workspaceFolders.map(
            workspaceItem => {
              xport.cache.build({ folder: workspaceItem.uri.fsPath }).then(files => {
                display(`Cached ${files.length} file(s) from '${workspaceItem.name}'.`, 'root');
              });
            }
          )
        );
      }
    }
  }
  setup(xportConfiguration);
}

exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}
exports.deactivate = deactivate;
