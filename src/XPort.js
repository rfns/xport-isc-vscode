const vscode = require('vscode');
const uniqBy = require('lodash.uniqby');
const uniq = require('lodash.uniq');
const flatten = require('lodash.flatten');

const XPortRequest = require('./XPortRequest');
const WatcherController = require('./WatcherController');
const CachedFiles = require('./CachedFiles');
const FileEventQueue = require('./FileEventQueue');

const { getPublishableFiles } = require('./lib/file');
const { getBasename, getFolder } = require('./lib/workspace');
const { display, showOutput } = require('./lib/output');

const { IS_CACHE_FOLDERS } = require('./constants');

class XPort {
  constructor(output) {
    this.cache = new CachedFiles(output);
    this.watcherController = new WatcherController(output, this.globCacheFolders);
    this._saveQueue = new FileEventQueue({ context: this, handler: this._handleSaveEvent });
    this._deleteQueue = new FileEventQueue({ context: this, handler: this._handleDeleteEvent });
    this._preventSaveEvent = false;
  }

  addToSaveQueue(e) {
    this._saveQueue.add(e);
  }

  addToDeleteQueue(e) {
    this._deleteQueue.add(e);
  }

  _handleSaveEvent(events) {
    if (this._preventSaveEvent) return;

    const projectFolders = uniq(events.map(e => {
      const folder = vscode.workspace.getWorkspaceFolder(e.uri || e);
      return folder ? folder.uri.fsPath : null;
    }).filter(e => !!e));

    projectFolders.forEach(projectFolder => {
      const projectName = getBasename(projectFolder);
      const projectFileEvents = events.filter(event => (event.uri || event).fsPath.indexOf(projectFolder) > -1);

      Promise.all(projectFileEvents.map(e => getPublishableFiles(e))).then(affectedFiles => {
        const files = uniqBy(flatten(affectedFiles), file => file.path);
        // No need to call the API if there isn't any files.
        if (files.length === 0) return;

        // Neither if a new file has just been created.
        if (files.length === 1 && files[0].content.length === 0) return;

        return this.cache.update(files.map(file => file.path)).then(() => {
          return XPortRequest.create({ folder: projectFolder }).publish(files).then(({ oks, error }) => {
            if (oks.length) display(`The following items were published to the server with success: \n\t${oks.join('\n\t')}.`, projectName);
            if (error) return Promise.reject(error);
          }).catch(error => {
            display(`ERROR: ${error.message}`, projectName);
            vscode.window.showErrorMessage(error.shortMessage, 'View output').then(choice => {
              if (choice === 'View output') return showOutput();
            });
          });
        });
      }).catch(err => {
        display(`FATAL: ${err.message}`, projectName);
      });
    });
  }

  _handleDeleteEvent(events) {
    const projectsFolders = uniq(events.map(e => vscode.workspace.getWorkspaceFolder(e).uri.fsPath));

    projectsFolders.forEach(projectFolder => {
      const projectName = getBasename(projectFolder);
      const projectFilePaths = events.filter(event => event.fsPath.indexOf(projectFolder) > -1).map(e => e.fsPath);

      XPortRequest.create({ folder: projectFolder }).delete(projectFilePaths, this.cache._files).then(({ oks, error }) => {
        if (oks.length) display(`The following items were DELETED: \n\t${oks.join('\n\t')}.`, projectName);
        if (error) return Promise.reject(error);
      }).catch(error => {
        display(`ERROR: ${error.message}`, projectName);
        vscode.window.showErrorMessage(error.shortMessage);
        return this.cache.update();
      });
    });
  }

  createWatcherOnNewFile() {
    this.watcherController.onDidCreate(e => this.addToSaveQueue(e));
    return { dispose: () => this.watcherController.dispose('onDidCreate') };
  }

  createWatcherOnDeleteFile() {
    this.watcherController.onDidDelete(e => this.addToDeleteQueue(e));
    return { dispose: () => this.watcherController.dispose('onDidDelete') };
  }

  createSyncCommand() {
    return vscode.commands.registerCommand('xport.forceServerSync', e => {
      this._preventSaveEvent = true;

      const folderPath = getFolder(e);
      const folderName = getBasename(folderPath);
      const target = e && e.fsPath;

      if (!folderName) {
        return vscode.window.showErrorMessage('XPort: Cannot synchronize while no workspace folder is selected.');
      }

      // Don't let the command proceed if the target is not a valid Caché item.
      if (!target.match(IS_CACHE_FOLDERS)) return;

      return vscode.window.showWarningMessage(
        'XPort: CAUTION: This action might overwrite modified files that weren\'t published to the server yet. Do you wish to proceed?',
        'YES', 'Cancel'
      ).then(choice => {
        if (choice !== 'YES') return;

        // Stops the _handleSaveEvent from calling the request API.
        this._preventSaveEvent = true;

        const items = [ e ? e.fsPath : '*' ];

        XPortRequest.create({ folder: folderPath }).synchronize(items, this.cache._files).then(({ oks, error }) => {
          if (oks.length) {
            display(`The following files were synchronized from the server: \n\t${oks.join('\n\t')}`, folderName);
            vscode.window.showInformationMessage(`XPort: ${oks.length + (oks.length > 1 ? ' files were' : ' file was')} synchronized from the server. Check the output for more details.`);
          }

          if (error) return Promise.reject(error);
          this._preventSaveEvent = false;
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