const uniq = require('lodash.uniq');
const flatten = require('lodash.flatten');

const { window, workspace } = require('vscode');

const { prepareOptionsAndPayload, fetchJSON } = require('./lib/request');
const { withCredentials } = require('./lib/authorization');
const { getBasename, getCurrentFolder } = require('./lib/workspace');

const {
  getMatchingPaths,
  writeFiles,
  ensurePathExists,
  formatToPublish
} = require('./lib/file');

const {
  CouldNotPublishItemsError,
  CouldNotWriteFilesError,
  CouldNotDeleteItemsError,
  CouldNotRemoveItemsError,
  HttpRequestError
} = require('./errors');

class XPortRequest {
  constructor({
    folder,
    server,
    namespace,
    headers = {},
    authentication = {}
  }) {
    this.server = server;
    this.folder = folder;
    this.namespace = namespace;
    this.projectName = getBasename(folder);
    this._headers = headers;

    withCredentials(authentication, this._headers);
  }

  publish(files) {
    let url = `${this.server}/api/xport/${this.namespace}/${this.projectName}/items/publish`;
    let filePayload = formatToPublish(files);

    if (!filePayload.length) {
      return Promise.resolve([]);
    }

    return window.withProgress({ location: 10, title: 'XPort: Publishing files ...' }, progress => {
      return fetchJSON(url, prepareOptionsAndPayload('POST', this._headers, {
        files: filePayload
      })).then(({ oks, errors, warning }) => {
        if (warning) window.showWarningMessage(warning);

        progress.report({ message: 'XPort: Patching file with the received data ...' });
        return writeFiles(oks).then(files => {
          let [ filesWritten, filesNotWritten ] = files;

          if (filesNotWritten.length) {
            filesNotWritten = filesNotWritten.map(fileNotWritten => { error: fileNotWritten })
          }

          const errorsPayload = [ ...errors, ...filesNotWritten ];

          if (errorsPayload.length) {
            return {
              oks: filesWritten,
              error: new CouldNotPublishItemsError(errorsPayload)
            };
          }
          return { oks: filesWritten };
        });
      });
    });
  }

  delete(filePaths = [], cachedFiles) {
    const url = `${this.server}/api/xport/${this.namespace}/${this.projectName}/items/delete`;
    const items = uniq(flatten(filePaths.map(path => getMatchingPaths(path, cachedFiles))));

    return window.withProgress({ location: 10, title: 'XPort: Requesting items deletion ...' }, () => {
      return fetchJSON(url, prepareOptionsAndPayload('POST', this._headers, {
        items
      })).then(({ oks, errors }) => {
        if (errors.length) {
          return {
            oks,
            error: new CouldNotDeleteItemsError(errors)
          };
        }
        return { oks };
      });
    });
  }

  remove(filePath, files) {
    let url = `${this.server}/api/xport/${this.namespace}/${this.projectName}/items/remove`;
    let items = [ filePath ];

    if (!files.includes(filePath)) {
      items = getMatchingPaths(filePath, files);
    }

    return window.withProgress({
      location: 10,
      title: 'XPort: Requesting items removal ...'
    }, () => {
      return fetchJSON(url, prepareOptionsAndPayload('POST', this._headers, {
        items
      })).then(data => {
        if (data.error_on_remove.length) {
          return {
            success: data.success_on_remove,
            error: new CouldNotRemoveItemsError(data.error_on_remove)
          };
        }
        return { success: data.success_on_remove };
      });
    });
  }

  synchronize(items = [], cachedFiles) {
    let url = `${this.server}/api/xport/${this.namespace}/${this.projectName}/items/fetch`;

    items = uniq(flatten(items.map(path => getMatchingPaths(path, cachedFiles))));

    return window.withProgress({ location: 10, title: 'XPort: Fetching file contents from the server ...' }, (progress) => {
      return fetchJSON(url, prepareOptionsAndPayload('POST', this._headers, {
        items,
        workspace: this.folder
      })).then(({ oks, errors }) => {
        progress.report({ message: 'XPort: Creating required paths ...' });
        return ensurePathExists(oks).then(files => ({ files, errors }));
      }).then(({ files, errors }) => {
        progress.report({ message: 'XPort: Writing files ...' });
        return writeFiles(files).then(files => {
          let [ filesWritten, filesNotWritten ] = files;

          if (filesNotWritten.length) {
            filesNotWritten = filesNotWritten.map(fileNotWritten => { error: fileNotWritten })
          }

          if (filesNotWritten.length || errors.length) {
            return {
              oks: filesWritten,
              error: new CouldNotWriteFilesError([ ...errors, ...filesNotWritten ])
            };
          }
          return { oks: filesWritten };
        });
      });
    });
  }

  static create({
    settings = workspace.getConfiguration('xport'),
    folder = getCurrentFolder()
  } = {}) {

    return new XPortRequest({
      folder,
      headers: Object.assign({}, settings.requestHeaders || {}),
      server: settings.remote.server,
      namespace: settings.remote.namespace,
      authentication: settings.authentication
    });
  }

  get endpoint() {
    return `${this.server}/api/xport/${this.namespace}/${this.projectName}`;
  }
}

module.exports = XPortRequest;
