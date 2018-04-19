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
  CouldNotRemoveItemsError
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

    return window.withProgress({ location: 15, title: `XPort (${this.projectName}): Publishing ${filePayload.length} files(s) ...` }, progress => {
      return fetchJSON(url, prepareOptionsAndPayload('POST', this._headers, {
        files: filePayload
      })).then(({ oks, errors, warning }) => {
        if (warning) window.showWarningMessage(warning);

        progress.report({ message: `XPort (${this.projectName}): Rewritting compiled files ...` });
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

  async delete(filePaths = [], cachedFiles) {
    const url = `${this.server}/api/xport/${this.namespace}/${this.projectName}/items/delete`;
    const items = uniq(flatten(filePaths.map(path => getMatchingPaths(path, cachedFiles))));    

    return window.withProgress({ location: 15, title: `XPort (${this.projectName}): Send request to delete ${items.length} files ...` }, async () => {
      const {oks, errors } = await fetchJSON(url, prepareOptionsAndPayload('POST', this._headers, { items }));
      if (errors.length) {
        return {
          oks,
          error: new CouldNotDeleteItemsError(errors)
        };
      }
      return { oks };
    });
  }

  async remove(filePath, files) {
    const url = `${this.server}/api/xport/${this.namespace}/${this.projectName}/items/remove`;
    const items = [ filePath ];

    if (!files.includes(filePath)) {
      items = getMatchingPaths(filePath, files);
    }

    return window.withProgress({
      location: 10,
      title: 'Requesting items removal ...'
    }, async () => {
      const { oks, errors } = fetchJSON(url, prepareOptionsAndPayload('POST', this._headers, { items }));

      if (errors.length) {
        return {
          oks,
          error: new CouldNotRemoveItemsError(errors)
        };
      }
      return { oks };
    });
  }

  async synchronize(items = [], cachedFiles) {
    let url = `${this.server}/api/xport/${this.namespace}/${this.projectName}/items/fetch`;

    if (!(items.length === 1 && items[0] === '*')) {      
      items = uniq(flatten(items.map(path => getMatchingPaths(path, cachedFiles))));
    }

    return window.withProgress({ location: 15, title: `XPort (${this.projectName}): Fetching sources from the server ...` }, async (progress) => {
      const { oks, errors } = await fetchJSON(url, prepareOptionsAndPayload('POST', this._headers, {
        items,
        workspace: this.folder
      }));

      progress.report({ message: `XPort (${this.projectName})$): Mirroring paths ...` });

      await ensurePathExists(oks);

      progress.report({ message: `XPort (${this.projectName}): Writing files ...` });
      const [ filesWritten, filesNotWritten ] = await writeFiles(oks);

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
