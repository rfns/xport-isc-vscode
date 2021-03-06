const { window, workspace } = require('vscode');
const { basename } = require('path');

const { IS_CACHE_FOLDERS } = require('../constants');

const getBasename = (folderPath = '') => basename(folderPath);

const findPathFromAvailableFolders = () => {
  if (!workspace.workspaceFolders) return;

  const folder = workspace.workspaceFolders.filter(workspaceItem => workspace.name === workspaceItem.name).pop();

  if (folder) return folder.uri.fsPath;
  return;
};

const getFolder = uri => {
  if (uri) {
    let folder = workspace.getWorkspaceFolder(uri);
    if (folder) return folder.uri.fsPath;
  } else {
    return getCurrentFolder();
  }
  return null;
}

const getCurrentFolder = () => {
  const editor = window.activeTextEditor;

  if (editor) {
    const resource = editor.document.uri;

    if (resource.scheme === 'file') {
      const folder = workspace.getWorkspaceFolder(resource);
      if (!folder) return findPathFromAvailableFolders();
      return folder.uri.fsPath;
    }
  }
  return findPathFromAvailableFolders();
}

const makeTypeRegexForWorkspaceFolder = workspaceFolder => new RegExp(`${workspaceFolder}${IS_CACHE_FOLDERS.source}`);

module.exports = {
  getCurrentFolder,
  getBasename,
  getFolder,
  makeTypeRegexForWorkspaceFolder
};


