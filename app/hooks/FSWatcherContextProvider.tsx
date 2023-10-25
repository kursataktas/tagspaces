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

import React, {
  createContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { FSWatcher } from 'chokidar';
import { useCurrentLocationContext } from '-/hooks/useCurrentLocationContext';
import PlatformIO from '-/services/platform-facade';
import AppConfig from '-/AppConfig';
import {
  extractContainingDirectoryPath,
  getFileLocationFromMetaFile
} from '@tagspaces/tagspaces-common/paths';
import { locationType } from '@tagspaces/tagspaces-common/misc';
import { PerspectiveIDs } from '-/perspectives';
import { useDirectoryContentContext } from '-/hooks/useDirectoryContentContext';
import { actions as AppActions, AppDispatch } from '-/reducers/app';
import { toFsEntry } from '-/services/utils-io';
import { useLocationIndexContext } from '-/hooks/useLocationIndexContext';
import { useDispatch } from 'react-redux';

type FSWatcherContextData = {
  watcher: FSWatcher;
  ignored: string[];
  stopWatching: () => void;
  isWatching: () => void;
  addToIgnored: (path: string) => void;
  removeFromIgnored: (path: string) => void;
  ignoreByWatcher: (...paths: string[]) => void;
  deignoreByWatcher: (...paths: string[]) => void;
};

export const FSWatcherContext = createContext<FSWatcherContextData>({
  watcher: undefined,
  ignored: undefined,
  stopWatching: undefined,
  isWatching: undefined,
  addToIgnored: undefined,
  removeFromIgnored: undefined,
  ignoreByWatcher: undefined,
  deignoreByWatcher: undefined
});

export type FSWatcherContextProviderProps = {
  children: React.ReactNode;
};

export const FSWatcherContextProvider = ({
  children
}: FSWatcherContextProviderProps) => {
  const { currentLocation } = useCurrentLocationContext();
  const {
    loadDirectoryContent,
    currentDirectoryPerspective,
    addDirectoryEntries,
    removeDirectoryEntries
  } = useDirectoryContentContext();
  const { reflectDeleteEntry, reflectCreateEntry } = useLocationIndexContext();
  const [watcher, setWatcher] = useState<FSWatcher>(undefined);
  const ignored = useRef<string[]>([]);
  const dispatch: AppDispatch = useDispatch();

  useEffect(() => {
    if (
      currentLocation &&
      currentLocation.watchForChanges &&
      currentLocation.type !== locationType.TYPE_CLOUD
    ) {
      const depth =
        currentDirectoryPerspective === PerspectiveIDs.KANBAN ? 3 : 1;
      setWatcher(
        watchFolder(PlatformIO.getLocationPath(currentLocation), depth)
      );
    } else {
      stopWatching();
    }
  }, [currentLocation]);

  useEffect(() => {
    watchForEvents();
  }, [addDirectoryEntries, removeDirectoryEntries]);

  function watchForEvents() {
    if (watcher !== undefined) {
      // To remove the listener
      watcher.removeAllListeners();
      watcher.on('all', listener);
    } /*else {
      console.log('Indexing not supported on this platform');
    }*/
  }

  function watchFolder(locationPath, depth) {
    console.log('Start watching: ' + locationPath);
    stopWatching();
    return PlatformIO.watchFolder(locationPath, {
      ignored: (path, stats) =>
        (/(^|[\/\\])\../.test(path) && !path.includes('.ts')) || // ignoring .dotfiles but not dirs like .ts
        (path.includes('.ts') && path.includes('tsi.json')), // ignoring .ts/tsi.json folder
      //  /(^|[\/\\])\../.test(path) || path.includes('.ts'), // ignoring .dotfiles // ignoring .ts folder
      // (stats && stats.isDirectory()),  // ignoring directories
      ignoreInitial: true,
      depth
    });
  }

  const listener = (event, path) => {
    console.log(`File ${path} has been ${event}`);
    if (path.endsWith(AppConfig.metaFolder)) {
      // .ts dir created
      return;
    }
    const pathParts = path.split(PlatformIO.getDirSeparator());
    for (let i = 0; i < ignored.current.length; i++) {
      if (path.startsWith(ignored[i]) || pathParts.includes(ignored[i])) {
        // ignored.current.splice(i, 1);
        return;
      }
    }
    /*const index = ignored.current.indexOf(path);
    if (index > -1) {
      ignored.current.splice(index, 1);
      return;
    }*/

    switch (event) {
      case 'unlink':
      case 'unlinkDir':
        if (!path.includes(AppConfig.metaFolder)) {
          removeDirectoryEntries([path]);
          reflectDeleteEntry(path);
          dispatch(AppActions.reflectDeleteEntry(path));
        }
        break;
      case 'add':
        if (!path.includes(AppConfig.metaFolder)) {
          const entry = toFsEntry(path, true);
          addDirectoryEntries([entry]);
          reflectCreateEntry(entry);
          dispatch(AppActions.reflectCreateEntry(path, true));
        }
        break;
      case 'addDir':
        if (!path.includes(AppConfig.metaFolder)) {
          const entry = toFsEntry(path, false);
          addDirectoryEntries([entry]);
          reflectCreateEntry(entry);
          dispatch(AppActions.reflectCreateEntry(path, false));
        }
        break;
      case 'change':
        console.log(`File ${path} has been changed`);

        // watching for changed sidecar files .ts/file.jpg.json
        if (path.includes(AppConfig.metaFolder)) {
          if (path.endsWith(AppConfig.metaFileExt)) {
            const directoryPath = getFileLocationFromMetaFile(
              path,
              PlatformIO.getDirSeparator()
            );
            loadDirectoryContent(
              extractContainingDirectoryPath(
                directoryPath,
                PlatformIO.getDirSeparator()
              ),
              false,
              true
            );
          }
          if (path.endsWith(AppConfig.metaFolderFile)) {
            const directoryPath = getFileLocationFromMetaFile(
              path,
              PlatformIO.getDirSeparator()
            );
            loadDirectoryContent(
              extractContainingDirectoryPath(
                directoryPath,
                PlatformIO.getDirSeparator()
              ),
              false,
              true
            );
          }
        }
        // } else { // TODO a separate watcher for the currently opened file should be created
        //   // handle file content changed
        //   dispatch(appActions.reflectUpdateOpenedFileContent(path));
        // }
        break;
      default:
        console.log(event, path);
        break;
    }
  };

  function stopWatching() {
    if (watcher && watcher.close) {
      watcher.close();
      setWatcher(undefined);
    }
  }

  function isWatching() {
    return watcher !== undefined; //&& !watcher.closed;
  }

  function addToIgnored(path: string) {
    const index = ignored.current.indexOf(path);
    if (index === -1) {
      ignored.current.push(path);
    }
  }

  function removeFromIgnored(path: string) {
    setTimeout(() => {
      for (let i = 0; i < ignored.current.length; i++) {
        const pathParts = ignored[i].split(PlatformIO.getDirSeparator());
        if (path.startsWith(ignored[i]) || pathParts.includes(path)) {
          ignored.current.splice(i, 1);
        }
      }
      /* const index = ignored.current.indexOf(path);
      if (index > -1) {
        ignored.current.splice(index, 1);
      }*/
    }, 1000);
  }

  function ignoreByWatcher(...paths) {
    if (isWatching()) {
      for (let i = 0; i < paths.length; i += 1) {
        addToIgnored(paths[i]);
      }
    }
  }

  function deignoreByWatcher(...paths) {
    if (isWatching()) {
      for (let i = 0; i < paths.length; i += 1) {
        removeFromIgnored(paths[i]);
      }
    }
  }

  const context = useMemo(() => {
    return {
      watcher,
      ignored: ignored.current,
      stopWatching,
      isWatching,
      addToIgnored,
      removeFromIgnored,
      ignoreByWatcher,
      deignoreByWatcher
    };
  }, [watcher, ignored.current]);

  return (
    <FSWatcherContext.Provider value={context}>
      {children}
    </FSWatcherContext.Provider>
  );
};
