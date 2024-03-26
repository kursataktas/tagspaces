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
import { TS } from '-/tagspaces.namespace';
import {
  getDescriptionPreview,
  loadJSONFile,
  mergeFsEntryMeta,
} from '-/services/utils-io';
import {
  getMetaDirectoryPath,
  getMetaFileLocationForDir,
} from '@tagspaces/tagspaces-common/paths';
import PlatformIO from '-/services/platform-facade';
import AppConfig from '-/AppConfig';
import versionMeta from '-/version.json';
import { usePlatformFacadeContext } from '-/hooks/usePlatformFacadeContext';
import { useSelector } from 'react-redux';
import { getSaveTagInLocation } from '-/reducers/settings';

type TagGroupsLocationContextData = {
  getTagGroups: (path: string) => Promise<TS.TagGroup[]>;
  createLocationTagGroup: (
    path: string,
    tagGroup: TS.TagGroup,
  ) => Promise<TS.FileSystemEntryMeta>;
  editLocationTagGroup: (
    path: string,
    tagGroup: TS.TagGroup,
    replaceTags?,
  ) => Promise<TS.FileSystemEntryMeta>;
  removeLocationTagGroup: (
    path: string,
    tagGroupUuid: string,
  ) => Promise<TS.FileSystemEntryMeta>;
  mergeLocationTagGroup: (
    path: string,
    tagGroup: TS.TagGroup,
  ) => Promise<TS.FileSystemEntryMeta>;
  loadLocationDataPromise: (
    path: string,
    metaFile?,
  ) => Promise<TS.FileSystemEntryMeta>;
};

export const TagGroupsLocationContext =
  createContext<TagGroupsLocationContextData>({
    getTagGroups: undefined,
    createLocationTagGroup: undefined,
    editLocationTagGroup: undefined,
    removeLocationTagGroup: undefined,
    mergeLocationTagGroup: undefined,
    loadLocationDataPromise: undefined,
  });

export type TagGroupsLocationContextProviderProps = {
  children: React.ReactNode;
};

export const TagGroupsLocationContextProvider = ({
  children,
}: TagGroupsLocationContextProviderProps) => {
  const { createDirectoryPromise, saveTextFilePromise } =
    usePlatformFacadeContext();

  const saveTagInLocation: boolean = useSelector(getSaveTagInLocation);

  /*useEffect(() => {
    if (currentLocation) {
      getTagGroups(currentLocation.path).then((groups) => {
        if (groups && groups.length > 0) {
          tagGroups.current = groups.map((group) => ({
            ...group,
            locationID: currentLocation.uuid,
          }));
        }
      });
    }
  }, [currentLocation]);*/

  function getTagGroups(path: string): Promise<TS.TagGroup[]> {
    return loadLocationDataPromise(path).then(
      (fsEntryMeta: TS.FileSystemEntryMeta) => {
        if (fsEntryMeta) {
          return fsEntryMeta.tagGroups;
        }
        return undefined;
      },
    );
  }

  async function loadLocationDataPromise(
    path: string,
    metaFile = AppConfig.folderLocationsFile,
  ): Promise<TS.FileSystemEntryMeta> {
    if (saveTagInLocation) {
      const entryProperties = await PlatformIO.getPropertiesPromise(path);
      if (!entryProperties.isFile) {
        const metaFilePath = getMetaFileLocationForDir(
          path,
          PlatformIO.getDirSeparator(),
          metaFile,
        );
        const metaData = await loadJSONFile(metaFilePath);
        if (metaData) {
          return {
            ...metaData,
            description: getDescriptionPreview(metaData.description, 200),
          };
        }
      }
    }
    return Promise.resolve(undefined);
  }

  function createLocationTagGroup(
    path: string,
    tagGroup: TS.TagGroup,
  ): Promise<TS.FileSystemEntryMeta> {
    if (!saveTagInLocation) {
      return Promise.resolve(undefined);
    }
    return loadLocationDataPromise(path)
      .then((fsEntryMeta: TS.FileSystemEntryMeta) => {
        let tagGroups;
        if (
          fsEntryMeta &&
          fsEntryMeta.tagGroups &&
          fsEntryMeta.tagGroups.length > 0
        ) {
          tagGroups = [
            ...fsEntryMeta.tagGroups.filter((tg) => tg.uuid !== tagGroup.uuid),
            tagGroup,
          ];
          //tagGroups = [...fsEntryMeta.tagGroups, tagGroup];
        } else {
          tagGroups = [tagGroup];
        }
        const updatedEntryMeta: TS.FileSystemEntryMeta = {
          ...(fsEntryMeta && fsEntryMeta),
          tagGroups,
        };
        return saveLocationDataPromise(path, updatedEntryMeta)
          .then(() => {
            return updatedEntryMeta;
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      })
      .catch(() => {
        const newFsEntryMeta: TS.FileSystemEntryMeta = mergeFsEntryMeta({
          tagGroups: [tagGroup],
        });
        return saveLocationDataPromise(path, newFsEntryMeta)
          .then(() => {
            return newFsEntryMeta;
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      });
  }

  function editLocationTagGroup(
    path: string,
    tagGroup: TS.TagGroup,
    replaceTags = false,
  ): Promise<TS.FileSystemEntryMeta> {
    if (!saveTagInLocation) {
      return Promise.resolve(undefined);
    }
    return new Promise((resolve, reject) => {
      loadLocationDataPromise(path)
        .then((fsEntryMeta: TS.FileSystemEntryMeta) => {
          const oldTagGroup = fsEntryMeta.tagGroups.find(
            (group) => group.uuid === tagGroup.uuid,
          );

          let tagGroups;
          if (!oldTagGroup) {
            // add new tag group
            tagGroups = [...fsEntryMeta.tagGroups, tagGroup];
          } else {
            let tags = tagGroup.children;
            if (!replaceTags) {
              oldTagGroup.children.forEach((oldTag) => {
                // filter out duplicated tags
                tags = tags.filter((t) => t.title !== oldTag.title);
              });
              tags = [...oldTagGroup.children, ...tags];
            }

            const newTagGroup = {
              ...tagGroup,
              children: tags,
            };
            if (fsEntryMeta.tagGroups && fsEntryMeta.tagGroups.length > 0) {
              tagGroups = [
                ...fsEntryMeta.tagGroups.filter(
                  (group) => group.uuid !== tagGroup.uuid,
                ),
                newTagGroup,
              ];
            } else {
              tagGroups = [newTagGroup];
            }
          }
          const updatedEntryMeta: TS.FileSystemEntryMeta = {
            ...fsEntryMeta,
            tagGroups,
          };
          saveLocationDataPromise(path, updatedEntryMeta)
            .then(() => {
              resolve(updatedEntryMeta);
              return true;
            })
            .catch((err) => {
              console.warn(
                'Error adding perspective for ' + path + ' with ' + err,
              );
              reject();
            });
          return true;
        })
        .catch(() => {
          const newFsEntryMeta: TS.FileSystemEntryMeta = mergeFsEntryMeta({
            tagGroups: [tagGroup],
          });
          saveLocationDataPromise(path, newFsEntryMeta)
            .then(() => {
              resolve(newFsEntryMeta);
              return true;
            })
            .catch((error) => {
              console.warn(
                'Error adding perspective for ' + path + ' with ' + error,
              );
              reject();
            });
        });
    });
  }

  function removeLocationTagGroup(
    path: string,
    tagGroupUuid: string,
  ): Promise<TS.FileSystemEntryMeta> {
    if (!saveTagInLocation) {
      return Promise.resolve(undefined);
    }
    return new Promise((resolve, reject) => {
      loadLocationDataPromise(path)
        .then((fsEntryMeta: TS.FileSystemEntryMeta) => {
          const tagGroups = fsEntryMeta.tagGroups.filter(
            (group) => group.uuid !== tagGroupUuid,
          );
          const updatedEntryMeta: TS.FileSystemEntryMeta = {
            ...fsEntryMeta,
            tagGroups,
          };
          saveLocationDataPromise(path, updatedEntryMeta)
            .then(() => {
              resolve(updatedEntryMeta);
              return true;
            })
            .catch((err) => {
              console.warn(
                'Error adding perspective for ' + path + ' with ' + err,
              );
              reject();
            });
          return true;
        })
        .catch((err) => {
          console.log(err);
        });
    });
  }

  function mergeLocationTagGroup(
    path: string,
    tagGroup: TS.TagGroup,
  ): Promise<TS.FileSystemEntryMeta> {
    if (!saveTagInLocation) {
      return Promise.resolve(undefined);
    }
    return new Promise((resolve, reject) => {
      loadLocationDataPromise(path)
        .then((fsEntryMeta: TS.FileSystemEntryMeta) => {
          const oldTagGroup = fsEntryMeta.tagGroups.find(
            (group) => group.uuid === tagGroup.uuid,
          );
          const newTagGroup = { ...tagGroup, children: oldTagGroup.children };
          let tagGroups;
          if (fsEntryMeta.tagGroups && fsEntryMeta.tagGroups.length > 0) {
            tagGroups = [...fsEntryMeta.tagGroups, newTagGroup];
          } else {
            tagGroups = [newTagGroup];
          }
          const updatedEntryMeta: TS.FileSystemEntryMeta = {
            ...fsEntryMeta,
            tagGroups,
          };
          saveLocationDataPromise(path, updatedEntryMeta)
            .then(() => {
              resolve(updatedEntryMeta);
              return true;
            })
            .catch((err) => {
              console.warn(
                'Error adding perspective for ' + path + ' with ' + err,
              );
              reject();
            });
          return true;
        })
        .catch(() => {
          const newFsEntryMeta: TS.FileSystemEntryMeta = mergeFsEntryMeta({
            tagGroups: [tagGroup],
          });
          saveLocationDataPromise(path, newFsEntryMeta)
            .then(() => {
              resolve(newFsEntryMeta);
              return true;
            })
            .catch((error) => {
              console.warn(
                'Error adding perspective for ' + path + ' with ' + error,
              );
              reject();
            });
        });
    });
  }

  async function saveLocationDataPromise(
    path: string,
    metaData: any,
  ): Promise<any> {
    if (!saveTagInLocation) {
      return Promise.resolve(undefined);
    }
    const entryProperties = await PlatformIO.getPropertiesPromise(path);
    if (entryProperties) {
      let metaFilePath;
      if (!entryProperties.isFile) {
        // check and create meta folder if not exist
        // todo not need to check if folder exist first createDirectoryPromise() recursively will skip creation of existing folders https://nodejs.org/api/fs.html#fs_fs_mkdir_path_options_callback
        const metaDirectoryPath = getMetaDirectoryPath(
          path,
          PlatformIO.getDirSeparator(),
        );
        const metaDirectoryProperties =
          await PlatformIO.getPropertiesPromise(metaDirectoryPath);
        if (!metaDirectoryProperties) {
          await createDirectoryPromise(metaDirectoryPath);
        }

        metaFilePath = getMetaFileLocationForDir(
          path,
          PlatformIO.getDirSeparator(),
          AppConfig.folderLocationsFile,
        );
      }
      const content = JSON.stringify({
        ...metaData,
        appName: versionMeta.name,
        appVersion: versionMeta.version,
        lastUpdated: new Date().toJSON(),
      });
      return saveTextFilePromise({ path: metaFilePath }, content, true);
    }
    return Promise.reject(new Error('file not found' + path));
  }

  const context = useMemo(() => {
    return {
      //locationTagGroups: tagGroups.current,
      getTagGroups,
      createLocationTagGroup,
      editLocationTagGroup,
      removeLocationTagGroup,
      mergeLocationTagGroup,
      loadLocationDataPromise,
    };
  }, [saveTagInLocation]);

  return (
    <TagGroupsLocationContext.Provider value={context}>
      {children}
    </TagGroupsLocationContext.Provider>
  );
};
