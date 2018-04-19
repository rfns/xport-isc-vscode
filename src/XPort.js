const vscode = require('vscode');
const uniqBy = require('lodash.uniqby');
const uniq = require('lodash.uniq');
const flatten = require('lodash.flatten');

const XPortRequest = require('./XPortRequest');
const FileSystemWatcher = require('./FileSystemWatcher');
const FileCache = require('./FileCache');
const FileEventQueue = require('./FileEventQueue');

const { getPublishableFiles } = require('./lib/file');
const { getBasename, getFolder, makeTypeRegexForWorkspaceFolder } = require('./lib/workspace');
const { display, showOutput } = require('./lib/output');

const { IS_CACHE_FOLDERS } = require('./constants');

class XPort {
  constructor(output) {
    this.cache = new FileCache();
    this._fsw = new FileSystemWatcher(output, this.globCacheFolders);
    this._saveQueue = new FileEventQueue({ context: this, handler: this._handleSaveEvent });
    this._deleteQueue = new FileEventQueue({ context: this, handler: this._handleDeleteEvent });
    this._preventSaveEvent = false;
  }

  addToSaveQueue(e) {
    const uri = e.uri || e;
    const workspaceFolderRegex = makeTypeRegexForWorkspaceFolder(getBasename(getFolder(uri)));
    if (!workspaceFolderRegex.test(uri.fsPath)) return;
    this._saveQueue.add(e);
  }

  addToDeleteQueue(e) {
    const workspaceFolderRegex = makeTypeRegexForWorkspaceFolder(getBasename(getFolder(e)));
    if (!workspaceFolderRegex.test(e.fsPath)) return;
    this._deleteQueue.add(e);
  }

  _handleSaveEvent(events) {
    if (this._preventSaveEvent) return;

    const folders = uniq(events.map(e => {
      const folder = vscode.workspace.getWorkspaceFolder(e.uri || e);
      return folder ? folder.uri.fsPath : null;
    }).filter(e => !!e));

    folders.forEach(folder => {
      const folderName = getBasename(folder);
      const folderFileEvents = events.filter(event => (event.uri || event).fsPath.indexOf(folder) > -1);

      Promise.all(folderFileEvents.map(e => getPublishableFiles(e))).then(affectedFiles => {
        const files = uniqBy(flatten(affectedFiles), file => file.path);
        // No need to call the API if there isn't any files.
        if (files.length === 0) return;

        // Neither if a new file has just been created.
        if (files.length === 1 && files[0].content.length === 0) return;

        return this.cache.update(files.map(file => file.path), { folderName }).then(() => {
          return XPortRequest.create({ folder }).publish(files).then(({ oks, error }) => {
            if (oks.length) display(`The following items were published to the server with success: \n\t${oks.join('\n\t')}.`, folderName);
            if (error) return Promise.reject(error);
          }).catch(error => {
            display(`ERROR: ${error.message}`, folderName);
            vscode.window.showErrorMessage(error.shortMessage, 'View output').then(choice => {
              if (choice === 'View output') return showOutput();
            });
          });
        });
      }).catch(err => {
        display(`FATAL: ${err.message}`, folderName);
      });
    });
  }

  _handleDeleteEvent(events) {
    const workspceFolders = uniq(events.map(e => vscode.workspace.getWorkspaceFolder(e).uri.fsPath));

    workspceFolders.forEach(workspaceFolder => {
      const folderName = getBasename(workspaceFolder);
      const projectFilePaths = events.filter(event => event.fsPath.indexOf(folderName) > -1).map(e => e.fsPath);

      XPortRequest.create({ folder: workspaceFolder }).delete(projectFilePaths, this.cache.filesFrom(folderName)).then(({ oks, error }) => {
        if (oks.length) display(`The following items were DELETED: \n\t${oks.join('\n\t')}.`, folderName);
        if (error) return Promise.reject(error);
      }).catch(error => {
        display(`ERROR: ${error.message}`, folderName);
        vscode.window.showErrorMessage(error.shortMessage, 'View output').then(choice => {
          if (choice === 'View output') return showOutput();
        });
      });
    });
  }

  createWatcherOnNewFile() {
    this._fsw.onDidCreate(e => this.addToSaveQueue(e));
    return { dispose: () => this._fsw.dispose('onDidCreate') };
  }

  createWatcherOnDeleteFile() {
    this._fsw.onDidDelete(e => this.addToDeleteQueue(e));
    return { dispose: () => this._fsw.dispose('onDidDelete') };
  }

  createSyncCommand() {
    return vscode.commands.registerCommand('xport.forceServerSync', e => {
      const folderPath = getFolder(e);
      const folderName = getBasename(folderPath);
      const target = e && e.fsPath;

      let items = [];

      if (!folderName) {
        return vscode.window.showErrorMessage('Cannot synchronize while there\'s no workspace folder selected.');
      }

      // Don't let the command proceed if the target is not a valid Caché item.
      if (target !== folderPath) {
        if (!target.match(IS_CACHE_FOLDERS)) return;

        items = [ e ? e.fsPath : '*' ];
      } else {
        items = ['*'];
      }

      return vscode.window.showWarningMessage(
        'CAUTION: This action might overwrite modified files that weren\'t published to the server yet. Do you wish to proceed?',
        'YES', 'Cancel'
      ).then(choice => {
        if (choice !== 'YES') return;

        // Stops the _handleSaveEvent from calling the request API.
        this._preventSaveEvent = true;

        XPortRequest.create({ folder: folderPath }).synchronize(items, this.cache.filesFrom(folderName)).then(({ oks, error }) => {
          this._preventSaveEvent = false;

          if (oks.length) {
            display(`The following files were synchronized with the server: \n\t${oks.join('\n\t')}`, folderName);
            vscode.window.showInformationMessage(`${oks.length + (oks.length > 1 ? ' files were' : ' file was')} synchronized with the server. Check the output for more details.`);
          }

          if (error) return Promise.reject(error);

        }).catch(error => {
          vscode.window.showErrorMessage(error.shortMessage);
          display(`ERROR: ${error.message}`);
          this._preventSaveEvent = false;
        });
      });
    });
  }
}

module.exports = XPort;
