const { workspace } = require('vscode');

const { GLOB_CACHE_FOLDERS } = require('./constants');

module.exports = class FileSystemWatcher {
  constructor() {
    this._disposables = new Map();
    this._handlers = new Map();
  }

  getHandler(key) {
    return this._handlers.get(key);
  }

  disposeWatchers() {
    this.dispose('onDidCreate');
    this.dispose('onDidDelete');
  }

  dispose(key) {
    if (this._disposables.has(key)) {
      this._disposables.get(key).map(disposable => disposable.dispose());
      this._disposables.delete(key);
      return true;
    }
    return false;
  }

  onDidCreate(handler) {
    this.dispose('onDidCreate');
    this._handlers.set('onDidCreate', handler);

    const watcher = workspace.createFileSystemWatcher(
      `**/**/${GLOB_CACHE_FOLDERS}`,
      false,
      true,
      true
    );

    const watcherRoot = workspace.createFileSystemWatcher(
      `**/**/${GLOB_CACHE_FOLDERS.split('/').pop()}`,
      false,
      true,
      true
    )

    watcher.onDidCreate(e => handler(e));
    watcherRoot.onDidCreate(e => handler(e));

    this._disposables.set('onDidCreate', [ watcherRoot, watcher ]);
    return watcher;
  }

  onDidDelete(handler) {
    this.dispose('onDidDelete');
    this._handlers.set('onDidDelete', handler);

    const watcher = workspace.createFileSystemWatcher(
      `**/${GLOB_CACHE_FOLDERS}`,
      true,
      true,
      false
    );

    const watcherRoot = workspace.createFileSystemWatcher(
      `**/${GLOB_CACHE_FOLDERS.split('/').pop()}`,
      true,
      true,
      false
    );

    watcher.onDidDelete(e => handler(e));
    watcherRoot.onDidDelete(e => handler(e));

    this._disposables.set('onDidDelete', [ watcher, watcherRoot ]);
    return watcher;
  }

}
