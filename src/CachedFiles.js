const vscode = require('vscode');
const uniq = require('lodash.uniq');

const { pathExists } = require('fs-extra');

const { getCurrentFolder, getBasename } = require('./lib/workspace');

const { GLOB_CACHE_FOLDERS } = require('./constants');

class CachedFiles {
  constructor(output) {
    this._files = [];
    this.output = output;
    this._currentFolderName = null;
  }

  update(incomingFiles = [], { skipPathCheck = false } = {}) {
    let files = uniq([ ...incomingFiles, ...this._files ]);

    return Promise.all(
      files.map(path => skipPathCheck || pathExists(path))
    ).then(existList => {
      return files.filter((file, index) => existList[index]);
    }).then(existingFiles => {
      this._files = existingFiles;
      return this._files;
    });
  }

  clear() {
    this._files = [];
  }

  refresh(folder = getBasename(getCurrentFolder())) {
    if (folder !== this._currentFolderName || this._files.length === 0) {
      return vscode.workspace.findFiles(`${GLOB_CACHE_FOLDERS}`, '**/node_modules/**/*').then(files => {
        this._currentFolderName = folder;
        return files.map(file => file.fsPath);
      }).then(files => {
        return this.update(files);
      });
    }
  }

  refreshFromResource(resource) {
    const folder = vscode.workspace.getWorkspaceFolder(resource);
    return this.refresh(getBasename(folder.uri.fsPath));
  }
}

module.exports = CachedFiles;
