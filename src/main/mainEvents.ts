import { app, dialog, globalShortcut, ipcMain, shell } from 'electron';
import {
  getPropertiesPromise,
  listDirectoryPromise,
  listMetaDirectoryPromise,
  createDirectoryPromise,
  copyFilePromise,
  renameFilePromise,
  renameDirectoryPromise,
  copyDirectoryPromise,
  moveDirectoryPromise,
  loadTextFilePromise,
  getFileContentPromise,
  saveFilePromise,
  saveTextFilePromise,
  saveBinaryFilePromise,
  deleteFilePromise,
  deleteDirectoryPromise,
  unZip,
  getDirProperties,
} from '@tagspaces/tagspaces-common-node/io-node';
import fs from 'fs-extra';
import path from 'path';
import {
  getOnProgress,
  isWorkerAvailable,
  newProgress,
  postRequest,
  readMacOSTags,
} from './util';

//let watcher: FSWatcher;
const progress = {};

export default function loadMainEvents() {
  ipcMain.handle('isWorkerAvailable', async () => {
    const results = await isWorkerAvailable();
    return results;
  });
  ipcMain.handle('resolveRelativePaths', (event, relativePath) => {
    return path.resolve(relativePath);
  });
  ipcMain.on('quitApp', () => {
    globalShortcut.unregisterAll();
    app.quit();
  });
  ipcMain.handle('getDevicePaths', () => {
    const paths: any = {
      desktopFolder: app.getPath('desktop'),
      documentsFolder: app.getPath('documents'),
      downloadsFolder: app.getPath('downloads'),
      musicFolder: app.getPath('music'),
      picturesFolder: app.getPath('pictures'),
      videosFolder: app.getPath('videos'),
    };
    if (process.platform === 'darwin') {
      paths.iCloudFolder =
        app.getPath('home') + '/Library/Mobile Documents/com~apple~CloudDocs';
    }
    return paths;
  });
  /*ipcMain.handle('isWorkerAvailable', async (event, wsPort) => {
    try {
      const res = fetch('http://127.0.0.1:' + wsPort, {
        method: 'HEAD',
      });
      return res.status === 200;
    } catch (e) {
      console.debug('isWorkerAvailable:', e);
    }
    return false;
  });*/
  ipcMain.handle('readMacOSTags', async (event, filename) => {
    const results = await readMacOSTags(filename);
    return results;
  });
  ipcMain.handle('postRequest', async (event, payload, endpoint) => {
    try {
      const result = await postRequest(payload, endpoint);
      return result;
    } catch (e) {
      console.error(e);
      return false;
    }
  });
  ipcMain.handle(
    'listDirectoryPromise',
    async (event, path, mode, ignorePatterns, resultsLimit) => {
      const result = await listDirectoryPromise(
        path,
        mode,
        ignorePatterns,
        resultsLimit,
      );
      return result;
    },
  );
  ipcMain.handle('listMetaDirectoryPromise', async (event, path) => {
    const result = await listMetaDirectoryPromise(path);
    return result;
  });
  ipcMain.handle('getPropertiesPromise', async (event, path) => {
    const result = await getPropertiesPromise(path);
    return result;
  });
  ipcMain.handle('checkDirExist', async (event, dir) => {
    const stats = await getPropertiesPromise(dir);
    return stats && !stats.isFile;
  });
  ipcMain.handle('checkFileExist', async (event, file) => {
    const stats = await getPropertiesPromise(file);
    return stats && stats.isFile;
  });
  ipcMain.handle('createDirectoryPromise', async (event, dirPath) => {
    const result = await createDirectoryPromise(dirPath);
    return result;
  });
  ipcMain.handle(
    'copyFilePromiseOverwrite',
    async (event, sourceFilePath, targetFilePath) => {
      const result = await copyFilePromise(sourceFilePath, targetFilePath);
      return result;
    },
  );
  ipcMain.handle(
    'renameFilePromise',
    async (event, filePath, newFilePath, onProgress) => {
      const result = await renameFilePromise(filePath, newFilePath, onProgress);
      return result;
    },
  );
  ipcMain.handle(
    'renameDirectoryPromise',
    async (event, dirPath, newDirName) => {
      const result = await renameDirectoryPromise(dirPath, newDirName);
      return result;
    },
  );
  ipcMain.handle(
    'copyDirectoryPromise',
    async (event, param, newDirPath, withProgress) => {
      if (withProgress) {
        progress['copyDirectoryPromise'] = newProgress(
          'moveDirectoryPromise',
          param.total,
        );
        const result = await copyDirectoryPromise(
          param,
          newDirPath,
          getOnProgress('copyDirectoryPromise', progress),
        );
        return result;
      } else {
        const result = await copyDirectoryPromise(param, newDirPath);
        return result;
      }
    },
  );
  ipcMain.handle('uploadAbort', async (event, path) => {
    if (path && progress[path] && progress[path].abort) {
      progress[path].abort();
    } else {
      // stop all
      Object.keys(progress).forEach((key) => {
        if (progress[key] && progress[key].abort) {
          progress[key].abort();
        }
      });
    }
    return true;
  });
  ipcMain.handle(
    'moveDirectoryPromise',
    async (event, param, newDirPath, withProgress) => {
      if (withProgress) {
        progress['moveDirectoryPromise'] = newProgress(
          'moveDirectoryPromise',
          param.total,
        );
        const result = await moveDirectoryPromise(
          param,
          newDirPath,
          getOnProgress('moveDirectoryPromise', progress),
        );
        return result;
      } else {
        const result = await moveDirectoryPromise(param, newDirPath);
        return result;
      }
    },
  );
  ipcMain.handle('loadTextFilePromise', async (event, path, isPreview) => {
    const result = await loadTextFilePromise(path, isPreview);
    return result;
  });
  ipcMain.handle('getFileContentPromise', async (event, filePath, type) => {
    const result = await getFileContentPromise(filePath, type);
    return result;
  });
  ipcMain.handle(
    'saveFilePromise',
    async (event, param, content, overwrite) => {
      const result = await saveFilePromise(param, content, overwrite);
      return result;
    },
  );
  ipcMain.handle(
    'saveTextFilePromise',
    async (event, param, content, overwrite) => {
      const result = await saveTextFilePromise(param, content, overwrite);
      return result;
    },
  );
  ipcMain.handle(
    'saveBinaryFilePromise',
    async (event, param, content, overwrite, onUploadProgress) => {
      const result = await saveBinaryFilePromise(
        param,
        content,
        overwrite,
        onUploadProgress,
      ).then((succeeded) => {
        if (succeeded && onUploadProgress) {
          onUploadProgress({ key: param.path, loaded: 1, total: 1 }, undefined);
        }
        return succeeded;
      });
      return result;
    },
  );
  ipcMain.handle('deleteFilePromise', async (event, path, useTrash) => {
    if (useTrash) {
      let ret;
      try {
        ret = await shell.trashItem(path);
      } catch (err) {
        console.error('moveToTrash ' + path + 'error:', err);
      }
      return ret;
    } else {
      const result = await deleteFilePromise(path);
      return result;
    }
  });
  ipcMain.handle('deleteDirectoryPromise', async (event, path, useTrash) => {
    if (useTrash) {
      let ret;
      try {
        ret = await shell.trashItem(path);
      } catch (err) {
        console.error('moveToTrash ' + path + 'error:', err);
      }
      return ret;
    } else {
      const result = await deleteDirectoryPromise(path);
      return result;
    }
  });
  ipcMain.on('openDirectory', async (event, dirPath) => {
    shell.showItemInFolder(dirPath);
  });
  ipcMain.on('openFile', async (event, filePath) => {
    shell
      .openPath(filePath)
      .then(() => {
        console.log('File successfully opened ' + filePath);
        return true;
      })
      .catch((e) => {
        console.log('Opening path ' + filePath + ' failed with ' + e);
      });
  });
  ipcMain.on('openUrl', async (event, url) => {
    await shell.openExternal(url);
  });
  ipcMain.handle('selectDirectoryDialog', async () => {
    const options = {
      properties: ['openDirectory', 'createDirectory'],
    };
    // @ts-ignore
    const resultObject = await dialog.showOpenDialog(options);

    if (resultObject.filePaths && resultObject.filePaths.length) {
      // alert(JSON.stringify(resultObject.filePaths));
      return resultObject.filePaths;
    }
    return false;
  });

  ipcMain.on('removeExtension', (e, extensionId) => {
    try {
      const extBuildIndex = extensionId.indexOf('/build');
      fs.rmSync(
        path.join(
          app.getPath('userData'),
          'tsplugins',
          extBuildIndex > -1
            ? extensionId.substring(0, extBuildIndex)
            : extensionId,
        ),
        {
          recursive: true,
        },
      );
    } catch (e) {
      console.debug(e);
    }
  });

  ipcMain.handle('getUserDataDir', () => {
    return app.getPath('userData');
  });

  ipcMain.handle('unZip', async (event, filePath, targetPath) => {
    const result = await unZip(filePath, targetPath);
    return result;
  });

  ipcMain.handle('getDirProperties', async (event, path) => {
    const result = await getDirProperties(path);
    return result;
  });
}
