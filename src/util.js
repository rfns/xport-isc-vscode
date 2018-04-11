const { window, workspace } = require('vscode');
const { normalize } = require('path');
const glob = require('glob-promise');
const { basename } = require('path');

const {
  readFile,
  lstat,
  mkdirp,
  writeFile
} = require('fs-extra');

const {
  CRLF,
  IS_CACHE_FOLDERS
} = require('./constants');

const generateMessageFromErrorPayload = errorPayload => {
  return errorPayload.map(itemError => {
    let message = ` Item: ${itemError.name} `
    let { error, errors, stack } = itemError

    if (error) {
      message = `${message} \n  Error: ${error.message}${error.origin? `\n > ${error.origin.message}` : ''}\n`
    }

    if (errors) {
      message = `${message} \n  Errors: ${errors.map((error, index) => {
        return `\n   [${index}] ${error.message}${error.origin? `\n > ${error.origin.message}` : ''}`
      }).join(' ')}\n`
    }

    if (stack) {
      message = `${message}\n Response stack: ${stack}\n`
    }

    return message
  }).join('\n')
};

const getConsolidatedFileInfo = (e) => {
  if (e.fsPath) {
    return lstat(e.fsPath).then(
      stats => stats.isDirectory()
        ? glob(`${e.fsPath}/**/*`, { nodir: true })
        : [ e.fsPath ]
    ).then(files => {
      files = files.filter(file => file.match(IS_CACHE_FOLDERS));
      return readBatchFiles(files);
    });
  } else {
    let result = [];

    if (e.fileName.match(IS_CACHE_FOLDERS)) {
      result.push({
        content: e.getText(),
        path: e.fileName
      });
    }
    return Promise.resolve(result);
  }
};

const getFilesFromPath = (path, files) => files.filter(file => file.substr(0, path.length) == path);

const patchWithAuthorizationHeader = settings => {
  if (settings.authentication) {
    let { username, password } = settings.authentication;
    let credentials = `Basic ${new Buffer(`${username}:${password}`).toString('base64')}`

    Object.assign(settings.requestHeaders, {
      Authorization: credentials
    });
  }
}

const createMissingPaths = sources => {
  return Promise.all(sources.map(source => {
    return mkdirp(source.directory).then(() =>  {
      let { path, file_name, content } = source;
      return {
        path,
        file_name,
        content
      };
    });
  }));
};

const writeBatchFiles = files => {
  let filesWritten = [];
  let filesNotWritten = [];

  return Promise.all(
    files.map(file => {
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

const readBatchFiles = (files) => {
  return Promise.all(files.map(file => {
    return readFile(file).then(buffer => {
      return {
        content: buffer.toString('utf-8'),
        path: normalize(file)
      }
    });
  }));
};

const makePublishablePayload = (files, cacheFolders) => {
  return files.reduce((validFiles, file) => {
    return file.path.match(cacheFolders) ? [
      ...validFiles,
      { path: file.path, content: file.content.split(CRLF) }
    ] : validFiles;
  }, []);
};

const getUniqueFiles = (filesA, filesB) => filesA.filter(fileName => !filesB.includes(fileName));

const getFolderFromActiveWorkspace = () => {
  const folder = workspace.workspaceFolders.filter(workspaceItem => workspace.name === workspaceItem.name).pop();
  if (folder) return folder.uri.fsPath;
  return;
};

const getCurrentWorkspaceFolder = () => {
  const editor = window.activeTextEditor;

  if (editor) {
    const resource = editor.document.uri;

    if (resource.scheme === 'file') {
      const folder = workspace.getWorkspaceFolder(resource);
      if (!folder) return getFolderFromActiveWorkspace();
      return folder.uri.fsPath;
    }
  }
  return getFolderFromActiveWorkspace();
}

const getCurrentWorkspaceFolderName = () => basename(getCurrentWorkspaceFolder());

module.exports = {
  generateMessageFromErrorPayload,
  getConsolidatedFileInfo,
  getFilesFromPath,
  patchWithAuthorizationHeader,
  createMissingPaths,
  writeBatchFiles,
  makePublishablePayload,
  getUniqueFiles,
  getCurrentWorkspaceFolder,
  getCurrentWorkspaceFolderName
};
