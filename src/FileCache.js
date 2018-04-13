const { workspace, RelativePattern } = require('vscode');
const { pathExists } = require('fs-extra');

const { getCurrentFolder, getBasename } = require('./lib/workspace');
const { GLOB_CACHE_FOLDERS } = require('./constants');

const getFilesFromNamedCache = (cache, folderName) => Array.from(cache.get(folderName) || []);

class FileCache {
  constructor() {
    this._cache = new Map();
  }

  update(incomingFiles = [], { skipFileExistsCheck = false, folderName = getBasename(getCurrentFolder()) } = {}) {
    const files = [ ...this.filesFrom(folderName), ...incomingFiles ];

    return Promise.all(
      !skipFileExistsCheck ? files.map(path => pathExists(path)) : files
    ).then(existList => {
      return files.filter((file, index) => existList[index]);
    }).then(existingFiles => {
      this._cache.set(folderName, new Set(existingFiles));
      return getFilesFromNamedCache(this._cache, folderName);
    });
  }

  build({ folder = getCurrentFolder(), force = false } = {}) {
    const folderName = getBasename(folder);

    if (force || getFilesFromNamedCache(this._cache, folderName).length === 0) {
      return workspace.findFiles(
        new RelativePattern(folder, `${GLOB_CACHE_FOLDERS}`)
      ).then(files => {
        return files.map(file => file.fsPath);
      }).then(files => {
        return this.update(files, { folderName: getBasename(folder) });
      }).then(files => {
        return files;
      });
    }
    return Promise.all(this.files);
  }

  purge(folderName) {
    const count = getFilesFromNamedCache(this._cache, folderName).length;

    if (count > 0) this._cache.delete(folderName);
    return count;
  }

  filesFrom(folderName) {
    return getFilesFromNamedCache(this._cache, folderName);
  }
}

module.exports = FileCache;
