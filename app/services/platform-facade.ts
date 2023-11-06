/**
 * TagSpaces - universal file and folder organizer
 * Copyright (C) 2017-present TagSpaces UG (haftungsbeschraenkt)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License (version 3) as
 * published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

import {
  platformHaveObjectStoreSupport,
  platformHaveWebDavSupport,
  platformIsMinio,
  platformGetDirSeparator,
  platformEnableObjectStoreSupport,
  platformDisableObjectStoreSupport,
  platformEnableWebdavSupport,
  platformDisableWebdavSupport,
  platformWatchDirectory,
  platformGetLocationPath,
  platformSetLanguage,
  platformIsWorkerAvailable,
  platformReadMacOSTags,
  platformWatchFolder,
  platformTiffJs,
  platformSetZoomFactorElectron,
  platformSetGlobalShortcuts,
  platformShowMainWindow,
  platformQuitApp,
  platformFocusWindow,
  platformGetDevicePaths,
  platformCreateDirectoryTree,
  platformCreateDirectoryIndexInWorker,
  platformCreateThumbnailsInWorker,
  platformGetURLforPath,
  platformListDirectoryPromise,
  platformListMetaDirectoryPromise,
  platformListObjectStoreDir,
  platformSaveFilePromise,
  platformGetPropertiesPromise,
  platformLoadTextFilePromise,
  platformGetFileContentPromise,
  platformGetLocalFileContentPromise,
  platformSaveTextFilePromise,
  platformSaveBinaryFilePromise,
  platformCreateDirectoryPromise,
  platformCopyFilePromise,
  platformRenameFilePromise,
  platformRenameDirectoryPromise,
  platformMoveDirectoryPromise,
  platformCopyDirectoryPromise,
  platformDeleteFilePromise,
  platformDeleteDirectoryPromise,
  platformOpenDirectory,
  platformShowInFileManager,
  platformOpenFile,
  // platformResolveFilePath,
  platformOpenUrl,
  platformSelectFileDialog,
  platformSelectDirectoryDialog,
  platformShareFiles,
  platformCreateIndex,
  platformCreateNewInstance,
  platformCheckFileExist,
  platformCheckDirExist,
  platformLoadExtensions,
  platformRemoveExtension,
  platformGetUserDataDir,
  platformUnZip,
  platformDirProperties,
} from '@tagspaces/tagspaces-platforms/platform-io';
import { cleanTrailingDirSeparator } from '@tagspaces/tagspaces-common/paths';
import AppConfig from '-/AppConfig';
import { TS } from '-/tagspaces.namespace';
import settings from '-/settings';

let token: string;

export default class PlatformFacade {
  static enableObjectStoreSupport = (objectStoreConfig: any): Promise<any> =>
    platformEnableObjectStoreSupport(objectStoreConfig);

  static disableObjectStoreSupport = (): void =>
    platformDisableObjectStoreSupport();

  static enableWebdavSupport = (webDavConfig: any): void => {
    platformEnableWebdavSupport(webDavConfig);
  };

  static disableWebdavSupport = (): void => platformDisableWebdavSupport();

  static haveObjectStoreSupport = (): boolean =>
    platformHaveObjectStoreSupport();

  static haveWebDavSupport = (): boolean => platformHaveWebDavSupport();

  static isMinio = (): boolean => platformIsMinio();

  static getDirSeparator = (): string => platformGetDirSeparator();

  static getLocationPath = (location: TS.Location): string =>
    platformGetLocationPath(location);

  static setLanguage = (language: string): void => {
    platformSetLanguage(language);
  };

  static setZoomFactorElectron = (zoomLevel) => {
    platformSetZoomFactorElectron(zoomLevel);
  };

  static setGlobalShortcuts = (globalShortcutsEnabled) => {
    platformSetGlobalShortcuts(globalShortcutsEnabled);
  };

  static showMainWindow = (): void => platformShowMainWindow();

  static createNewInstance = (url?: string): void => {
    if (AppConfig.isElectron) {
      platformCreateNewInstance(url);
    } else {
      if (url) {
        window.open(url, '_blank');
      } else {
        window.open('index.html', '_blank');
      }
    }
  };

  static quitApp = (): void => platformQuitApp();

  static watchDirectory = (dirPath: string, listener): void =>
    platformWatchDirectory(dirPath, listener);

  static focusWindow = (): void => platformFocusWindow();

  static getDevicePaths = (): Promise<any> => platformGetDevicePaths();

  /* static getAppDataPath = (): string => nativeAPI.getAppDataPath();

  static getUserHomePath = (): string => nativeAPI.getUserHomePath(); */

  static getURLforPath = (path: string, expirationInSeconds?: number): string =>
    platformGetURLforPath(path, expirationInSeconds);

  static createDirectoryTree = (directoryPath: string): Object =>
    platformCreateDirectoryTree(directoryPath);

  static isWorkerAvailable = (): boolean => {
    if (token !== undefined) {
      return token !== 'not';
    }
    try {
      // eslint-disable-next-line global-require
      const config = require('-/config/config.json');
      if (platformIsWorkerAvailable(settings.getUsedWsPort())) {
        token = config.jwt;
      }
    } catch (e) {
      if (e && e.code && e.code === 'MODULE_NOT_FOUND') {
        console.debug('jwt token not available');
        token = 'not';
      }
    }
    return false;
  };

  static readMacOSTags = (filename: string): Promise<TS.Tag[]> => {
    return platformReadMacOSTags(filename);
  };

  static watchFolder = (locationPath, options) => {
    return platformWatchFolder(locationPath, options);
  };

  static tiffJs = () => {
    return platformTiffJs();
  };

  static createDirectoryIndexInWorker = (
    directoryPath: string,
    extractText: boolean,
    ignorePatterns: Array<string>,
  ): Promise<any> => {
    if (!PlatformFacade.isWorkerAvailable()) {
      return Promise.reject(new Error('no Worker Available!'));
    }
    return platformCreateDirectoryIndexInWorker(
      token,
      directoryPath,
      extractText,
      ignorePatterns,
      settings.getUsedWsPort(),
    );
  };

  static createThumbnailsInWorker = (
    tmbGenerationList: Array<string>,
  ): Promise<any> => {
    if (!PlatformFacade.isWorkerAvailable()) {
      return Promise.reject(new Error('no Worker Available!'));
    }
    return platformCreateThumbnailsInWorker(
      token,
      tmbGenerationList,
      settings.getUsedWsPort(),
    );
  };

  /**
   * Promise === undefined on error
   * @param path
   * @param mode = ['extractTextContent', 'extractThumbPath']
   * @param ignorePatterns
   * @param resultsLimit
   */
  static listDirectoryPromise = (
    path: string,
    mode = ['extractThumbPath'],
    ignorePatterns: Array<string> = [],
    resultsLimit: any = {},
  ): Promise<Array<any>> =>
    platformListDirectoryPromise(
      path, // cleanTrailingDirSeparator(path),
      mode,
      ignorePatterns,
      resultsLimit,
    );

  static listMetaDirectoryPromise = (path: string): Promise<Array<any>> =>
    platformListMetaDirectoryPromise(path);

  static listObjectStoreDir = (
    param: Object,
    mode = ['extractThumbPath'],
    ignorePatterns: Array<string> = [],
  ): Promise<Array<any>> =>
    platformListObjectStoreDir(param, mode, ignorePatterns);

  static getPropertiesPromise = (path: string): Promise<any> =>
    platformGetPropertiesPromise(path);

  static checkDirExist = (dir: string): Promise<boolean> =>
    platformCheckDirExist(dir);

  static checkFileExist = (file: string): Promise<boolean> =>
    platformCheckFileExist(file);

  static createDirectoryPromise = (dirPath: string): Promise<any> => {
    //PlatformFacade.ignoreByWatcher(dirPath);
    return platformCreateDirectoryPromise(dirPath);
  };

  /**
   * @param sourceFilePath
   * @param targetFilePath - if exist overwrite it
   */
  static copyFilePromiseOverwrite = (
    sourceFilePath: string,
    targetFilePath: string,
  ): Promise<any> => {
    //PlatformFacade.ignoreByWatcher(targetFilePath);
    return platformCopyFilePromise(sourceFilePath, targetFilePath);
  };

  static renameFilePromise = (
    filePath: string,
    newFilePath: string,
    onProgress = undefined,
  ): Promise<any> => {
    //PlatformFacade.ignoreByWatcher(filePath, newFilePath);
    return platformRenameFilePromise(filePath, newFilePath, onProgress);
  };

  static renameDirectoryPromise = (
    dirPath: string,
    newDirName: string,
  ): Promise<any> => {
    // PlatformFacade.ignoreByWatcher(dirPath, newDirName);
    return platformRenameDirectoryPromise(dirPath, newDirName);
  };

  static copyDirectoryPromise = (
    param: any,
    newDirPath: string,
    onProgress = undefined,
  ): Promise<any> => {
    //PlatformFacade.ignoreByWatcher(param.path, newDirPath);
    return platformCopyDirectoryPromise(param, newDirPath, onProgress);
  };

  static moveDirectoryPromise = (
    param: any,
    newDirPath: string,
    onProgress = undefined,
  ): Promise<any> => {
    //PlatformFacade.ignoreByWatcher(param.path, newDirPath);
    return platformMoveDirectoryPromise(param, newDirPath, onProgress);
  };

  static loadTextFilePromise = (
    filePath: string,
    isPreview?: boolean,
  ): Promise<any> => {
    let path = filePath;
    try {
      path = decodeURIComponent(filePath);
    } catch (ex) {}
    return platformLoadTextFilePromise(path, isPreview);
  };

  static getFileContentPromise = (
    filePath: string,
    type?: string,
  ): Promise<any> => platformGetFileContentPromise(filePath, type);

  static getLocalFileContentPromise = (
    filePath: string,
    type?: string,
  ): Promise<any> => platformGetLocalFileContentPromise(filePath, type);

  static saveFilePromise = (
    param: any,
    content: any,
    overwrite: boolean,
  ): Promise<any> => {
    //PlatformFacade.ignoreByWatcher(param.path);
    return platformSaveFilePromise(param, content, overwrite);
  };

  static saveTextFilePromise = (
    param: any,
    content: string,
    overwrite: boolean,
  ): Promise<any> => {
    //PlatformFacade.ignoreByWatcher(param.path);
    return platformSaveTextFilePromise(param, content, overwrite);
  };

  static saveBinaryFilePromise = (
    param: any,
    content: any,
    overwrite: boolean,
    onUploadProgress?: (
      progress: any, // ManagedUpload.Progress,
      response: any, // AWS.Response<AWS.S3.PutObjectOutput, AWS.AWSError>
    ) => void,
  ): Promise<TS.FileSystemEntry> => {
    //PlatformFacade.ignoreByWatcher(param.path);

    return platformSaveBinaryFilePromise(
      param,
      content,
      overwrite,
      onUploadProgress,
    );
  };

  static deleteFilePromise = (
    path: string,
    useTrash?: boolean,
  ): Promise<any> => {
    //PlatformFacade.ignoreByWatcher(path);
    return platformDeleteFilePromise(path, useTrash);
  };

  static deleteDirectoryPromise = (
    path: string,
    useTrash?: boolean,
  ): Promise<any> => {
    //PlatformFacade.ignoreByWatcher(path);
    return platformDeleteDirectoryPromise(path, useTrash);
  };

  static openDirectory = (dirPath: string): void =>
    platformOpenDirectory(dirPath);

  static showInFileManager = (dirPath: string): void =>
    platformShowInFileManager(dirPath);

  static openFile = (
    filePath: string,
    warningOpeningFilesExternally: boolean,
  ): void => {
    if (
      !warningOpeningFilesExternally ||
      // eslint-disable-next-line no-restricted-globals
      confirm(
        'Do you really want to open "' +
          filePath +
          '"? Execution of some files can be potentially dangerous!',
      )
    ) {
      platformOpenFile(filePath);
    }
  };

  /*  @deprecated not work in S3 use getLocationPath instead
  static resolveFilePath = (filePath: string): string =>
    platformResolveFilePath(filePath);*/

  static openUrl = (url: string): void => platformOpenUrl(url);

  static selectFileDialog = (): Promise<any> => platformSelectFileDialog();

  static selectDirectoryDialog = (): Promise<any> =>
    platformSelectDirectoryDialog();

  static shareFiles = (files: Array<string>): void => {
    platformShareFiles(files);
  };

  static createIndex(
    param: any,
    mode: string[],
    ignorePatterns: Array<string>,
    listDirectoryPromise,
    loadTextFilePromise,
  ) {
    return platformCreateIndex(
      param,
      mode,
      ignorePatterns,
      listDirectoryPromise,
      loadTextFilePromise,
    );
  }

  static loadExtensions() {
    return platformLoadExtensions();
  }

  static removeExtension(extensionId: string) {
    return platformRemoveExtension(extensionId);
  }

  static getUserDataDir(): Promise<string> {
    return platformGetUserDataDir();
  }

  static unZip(filePath, targetPath): Promise<string> {
    return platformUnZip(filePath, targetPath);
  }

  static getDirProperties(filePath): Promise<TS.DirProp> {
    return platformDirProperties(filePath);
  }
}
