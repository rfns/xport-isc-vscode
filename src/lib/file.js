const glob = require('glob-promise');
const { readFile, lstat, mkdirp, writeFile } = require('fs-extra');
const { normalize, dirname } = require('path');

const { CRLF, IS_CACHE_FOLDERS } = require('../constants');

const getPublishableFiles = resource => {
  if (resource.fsPath) {
    return lstat(resource.fsPath).then(
      stats => stats.isDirectory()
        ? glob(`${resource.fsPath}/**/*`, { nodir: true })
        : [ resource.fsPath ]
    ).then(files => {
      files = files.filter(file => file.match(IS_CACHE_FOLDERS));
      return readFiles(files);
    });
  } else {
    let result = [];

    if (resource.fileName.match(IS_CACHE_FOLDERS)) {
      result.push({
        content: resource.getText(),
        path: resource.fileName
      });
    }
    return Promise.resolve(result);
  }
};

const formatToPublish = (files, cacheFolders) => {
  return files.reduce((validFiles, file) => {
    return file.path.match(cacheFolders) ? [
      ...validFiles,
      { path: file.path, content: file.content.split(CRLF) }
    ] : validFiles;
  }, []);
};

const readFiles = files => {
  return Promise.all(files.map(file => {
    return readFile(file).then(buffer => {
      return {
        content: buffer.toString('utf-8'),
        path: normalize(file)
      }
    });
  }));
};

const writeFiles = files => {
  let filesWritten = [];
  let filesNotWritten = [];

  return Promise.all(
    files.map(file => {
      // Don't care about what map returns, it's needed only to wait all writes to be finished.
      if (!file.content.length) {
        filesWritten.push(file.path);
        return;
      }

      return writeFile(file.path, file.content.join(CRLF)).then(() => {
        filesWritten.push(file.path);
      }).catch(err => {
        filesNotWritten.push({ name: file.path, message: err.message });
      });
    })
  ).then(
    () => [ filesWritten, filesNotWritten ]
  );
};

const ensurePathExists = sources => {
  return Promise.all(sources.map(source => {
    return mkdirp(dirname(source.path)).then(() =>  {
      let { path, file_name, content } = source;
      return {
        path,
        file_name,
        content
      };
    });
  }));
};

const getMatchingPaths = (path, files) => files.filter(file => file.substr(0, path.length) == path);

module.exports = {
  getPublishableFiles,
  formatToPublish,
  writeFiles,
  ensurePathExists,
  getMatchingPaths
};

