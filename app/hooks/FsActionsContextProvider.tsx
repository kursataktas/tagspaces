/**
 * TagSpaces - universal file and folder organizer
 * Copyright (C) 2023-present TagSpaces UG (haftungsbeschraenkt)
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

import React, { createContext, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { actions as AppActions, AppDispatch } from '-/reducers/app';
import { useTranslation } from 'react-i18next';
import PlatformIO from '-/services/platform-facade';
import {
  extractDirectoryName,
  getMetaFileLocationForFile,
  getThumbFileLocationForFile
} from '@tagspaces/tagspaces-common/paths';
import { useOpenedEntryContext } from '-/hooks/useOpenedEntryContext';
import { getWarningOpeningFilesExternally } from '-/reducers/settings';
import { useDirectoryContentContext } from '-/hooks/useDirectoryContentContext';
import { renameFilesPromise } from '-/services/utils-io';
import { useNotificationContext } from '-/hooks/useNotificationContext';
import { useLocationIndexContext } from '-/hooks/useLocationIndexContext';
import { useSelectedEntriesContext } from '-/hooks/useSelectedEntriesContext';

type FsActionsContextData = {
  renameDirectory: (
    directoryPath: string,
    newDirectoryName: string
  ) => Promise<string>;
  renameFile: (filePath: string, newFilePath: string) => Promise<boolean>;
  openFileNatively: (selectedFile?: string) => void;
};

export const FsActionsContext = createContext<FsActionsContextData>({
  renameDirectory: () => Promise.resolve(''),
  renameFile: () => Promise.resolve(false),
  openFileNatively: undefined
});

export type FsActionsContextProviderProps = {
  children: React.ReactNode;
};

export const FsActionsContextProvider = ({
  children
}: FsActionsContextProviderProps) => {
  const { t } = useTranslation();
  const { setSelectedEntries, selectedEntries } = useSelectedEntriesContext();
  const { openedEntries, reflectRenameDirectory } = useOpenedEntryContext();
  const { openDirectory, currentDirectoryPath } = useDirectoryContentContext();
  const { reflectRenameEntry } = useLocationIndexContext();
  const { showNotification } = useNotificationContext();
  const dispatch: AppDispatch = useDispatch();
  const warningOpeningFilesExternally = useSelector(
    getWarningOpeningFilesExternally
  );

  function renameDirectory(directoryPath: string, newDirectoryName: string) {
    return PlatformIO.renameDirectoryPromise(directoryPath, newDirectoryName)
      .then(newDirPath => {
        if (currentDirectoryPath === directoryPath) {
          openDirectory(newDirPath).then(() => {
            reflectRenameDirectory(directoryPath, newDirPath);
            reflectRenameEntry(directoryPath, newDirPath);
          });
        } else {
          reflectRenameEntry(directoryPath, newDirPath);
          dispatch(AppActions.reflectRenameEntry(directoryPath, newDirPath));
        }
        setSelectedEntries([]);

        showNotification(
          `Renaming directory ${extractDirectoryName(
            directoryPath,
            PlatformIO.getDirSeparator()
          )} successful.`,
          'default',
          true
        );
        return newDirPath;
      })
      .catch(error => {
        console.warn('Error while renaming directory: ' + error);
        showNotification(
          `Error renaming directory '${extractDirectoryName(
            directoryPath,
            PlatformIO.getDirSeparator()
          )}'`,
          'error',
          true
        );
        throw error;
      });
  }

  function renameFile(filePath: string, newFilePath: string): Promise<boolean> {
    return PlatformIO.renameFilePromise(filePath, newFilePath)
      .then(result => {
        const newFilePathFromPromise = result[1];
        console.info('File renamed ' + filePath + ' to ' + newFilePath);
        showNotification(t('core:renamingSuccessfully'), 'default', true);
        // Update sidecar file and thumb
        return renameFilesPromise([
          [
            getMetaFileLocationForFile(filePath, PlatformIO.getDirSeparator()),
            getMetaFileLocationForFile(
              newFilePath,
              PlatformIO.getDirSeparator()
            )
          ],
          [
            getThumbFileLocationForFile(
              filePath,
              PlatformIO.getDirSeparator(),
              false
            ),
            getThumbFileLocationForFile(
              newFilePath,
              PlatformIO.getDirSeparator(),
              false
            )
          ]
        ])
          .then(() => {
            reflectRenameEntry(filePath, newFilePathFromPromise);
            dispatch(
              AppActions.reflectRenameEntry(filePath, newFilePathFromPromise)
            );
            setSelectedEntries([]);
            console.info(
              'Renaming meta file and thumb successful from ' +
                filePath +
                ' to:' +
                newFilePath
            );
            return true;
          })
          .catch(err => {
            reflectRenameEntry(filePath, newFilePathFromPromise);
            dispatch(
              AppActions.reflectRenameEntry(filePath, newFilePathFromPromise)
            );
            setSelectedEntries([]);
            console.warn(
              'Renaming meta file and thumb failed from ' +
                filePath +
                ' to:' +
                newFilePath,
              err
            );
            return false;
          });
      })
      .catch(error => {
        console.log(`Error while renaming file ${filePath}`, error);
        showNotification(
          `Error while renaming file ${filePath}`,
          'error',
          true
        );
        return false;
      });
  }

  function openFileNatively(selectedFile?: string) {
    // todo reload selectedEntries or find better place for this function
    if (selectedFile === undefined) {
      if (selectedEntries && selectedEntries.length > 0) {
        const fsEntry = selectedEntries[selectedEntries.length - 1];
        if (fsEntry.isFile) {
          PlatformIO.openFile(fsEntry.path, warningOpeningFilesExternally);
        } else {
          PlatformIO.openDirectory(fsEntry.path);
        }
      }
    } else {
      PlatformIO.openFile(selectedFile, warningOpeningFilesExternally);
    }
  }

  const context = useMemo(() => {
    return {
      renameDirectory,
      renameFile,
      openFileNatively
    };
  }, [openedEntries]);

  return (
    <FsActionsContext.Provider value={context}>
      {children}
    </FsActionsContext.Provider>
  );
};
