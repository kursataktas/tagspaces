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

import React, {
  MutableRefObject,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState
} from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { GlobalHotKeys } from 'react-hotkeys';
import fscreen from 'fscreen';
import Button from '@mui/material/Button';
import LoadingButton from '@mui/lab/LoadingButton';
import Tooltip from '-/components/Tooltip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import BookmarkIcon from '@mui/icons-material/BookmarkTwoTone';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAddTwoTone';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import FullScreenIcon from '@mui/icons-material/ZoomOutMap';
import OpenNativelyIcon from '@mui/icons-material/Launch';
import PrevDocumentIcon from '@mui/icons-material/KeyboardArrowUp';
import NextDocumentIcon from '@mui/icons-material/KeyboardArrowDown';
import FileDownloadIcon from '@mui/icons-material/AssignmentReturned';
import DetailsIcon from '@mui/icons-material/Info';
import ExpandIcon from '@mui/icons-material/SettingsEthernet';
import withStyles from '@mui/styles/withStyles';
import Box from '@mui/material/Box';
import ButtonGroup from '@mui/material/ButtonGroup';
import {
  ParentFolderIcon,
  NavigateToFolderIcon,
  OpenNewWindowIcon,
  CancelIcon,
  ReloadIcon,
  DeleteIcon,
  LinkIcon
} from '-/components/CommonIcons';
import HistoryIcon from '@mui/icons-material/History';
import { Split } from 'ts-react-splitter';
import { getUuid } from '@tagspaces/tagspaces-common/utils-io';
import { buffer } from '@tagspaces/tagspaces-common/misc';
import AppConfig from '-/AppConfig';
import {
  getMetaFileLocationForDir,
  getMetaFileLocationForFile,
  extractContainingDirectoryPath,
  extractTitle,
  extractFileExtension,
  baseName,
  extractFileName,
  extractDirectoryName,
  generateSharingLink,
  getBackupFileLocation,
  cleanRootPath
} from '@tagspaces/tagspaces-common/paths';
import { ProTooltip } from '-/components/HelperComponents';
import EntryProperties from '-/components/EntryProperties';
import TagsPreview from '-/components/TagsPreview';
import ConfirmDialog from '-/components/dialogs/ConfirmDialog';
import PlatformIO from '-/services/platform-facade';
import AddRemoveTagsDialog from '-/components/dialogs/AddRemoveTagsDialog';
import i18n from '-/services/i18n';
import {
  actions as SettingsActions,
  isDesktopMode,
  getKeyBindingObject,
  getMapTileServer,
  getCurrentLanguage,
  isRevisionsEnabled
} from '-/reducers/settings';
import TaggingActions from '-/reducers/tagging-actions';
import {
  OpenedEntry,
  NotificationTypes,
  isReadOnlyMode,
  actions as AppActions
} from '-/reducers/app';
import useEventListener from '-/utils/useEventListener';
import { TS } from '-/tagspaces.namespace';
import FileView from '-/components/FileView';
import { Pro } from '-/pro';
import { actions as LocationActions, getLocations } from '-/reducers/locations';
import Revisions from '-/components/Revisions';
import { Switch } from '@mui/material';
import useFirstRender from '-/utils/useFirstRender';
import ResolveConflictDialog from '-/components/dialogs/ResolveConflictDialog';
import { dataTidFormat } from '-/services/test';
import { getMetaForEntry, loadJSONFile } from '-/services/utils-io';

const defaultSplitSize = '7.86%'; // '7.2%'; // 103;
// const openedSplitSize = AppConfig.isElectron ? 560 : 360;
/* const fullSplitSize = 750;
// const maxCharactersTitleLength = 50;
*/
const bufferedSplitResize = buffer({
  timeout: 300,
  id: 'buffered-split-resize'
});

const styles: any = (theme: any) => ({
  toolbar2: {
    width: '100%',
    paddingLeft: 0,
    paddingRight: 5,
    paddingTop: 0,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    zIndex: 2
    // borderBottom: '1px solid ' + theme.palette.divider
  },
  flexLeft: {
    flexDirection: 'row',
    flex: '1 1',
    display: 'flex',
    alignItems: 'baseline',
    overflowX: 'auto',
    overflowY: 'hidden',
    paddingRight: 100
  },
  fileBadge: {
    color: 'white',
    backgroundColor: AppConfig.defaultFileColor,
    padding: 3,
    textShadow: '1px 1px #8f8f8f',
    fontSize: 13,
    marginLeft: 3,
    borderRadius: 3
  }
});

interface Props {
  classes: any;
  theme: any;
  openedFiles: Array<OpenedEntry>;
  settings: any;
  keyBindings: any;
  closeAllFiles: () => void;
  renameFile: () => void;
  renameDirectory: () => void;
  addTags: () => void;
  removeTags: () => void;
  openFsEntry: (fsEntry: TS.FileSystemEntry) => void;
  openPrevFile: (path: string) => void;
  openNextFile: (path: string) => void;
  openFileNatively: (path: string) => void;
  openLink: (url: string, options?: any) => void;
  openDirectory: (path: string) => void;
  showNotification: (
    text: string,
    notificationType?: string, // NotificationTypes
    autohide?: boolean
  ) => void;
  removeAllTags: () => void;
  deleteFile: (path: string, uuid: string) => void;
  toggleEntryFullWidth: () => void;
  isReadOnlyMode: boolean;
  setEntryPropertiesSplitSize: (size: string) => void;
  updateOpenedFile: (
    entryPath: string,
    fsEntryMeta: any // FileSystemEntryMeta
  ) => Promise<boolean>;
  // reflectUpdateSidecarMeta: (path: string, entryMeta: Object) => void;
  updateThumbnailUrl: (path: string, thumbUrl: string) => void;
  // setLastSelectedEntry: (path: string) => void;
  loadDirectoryContent: (
    path: string,
    generateThumbnails: boolean,
    loadDirMeta?: boolean
  ) => void;
  currentDirectoryPath: string | null;
  isDesktopMode: boolean;
  tileServer: TS.MapTileServer;
  switchLocationType: (locationId: string) => Promise<string | null>;
  switchCurrentLocationType: (currentLocationId) => Promise<boolean>;
  revisionsEnabled: boolean;
  locations: Array<TS.Location>;
}

const historyKeys = Pro && Pro.history ? Pro.history.historyKeys : {};

function EntryContainer(props: Props) {
  const {
    classes,
    keyBindings,
    theme,
    settings,
    openedFiles,
    currentDirectoryPath,
    isDesktopMode,
    toggleEntryFullWidth,
    isReadOnlyMode,
    updateOpenedFile,
    updateThumbnailUrl,
    renameFile,
    renameDirectory,
    addTags,
    removeTags,
    removeAllTags,
    deleteFile,
    openLink,
    closeAllFiles,
    openFileNatively,
    openDirectory,
    setEntryPropertiesSplitSize,
    showNotification,
    tileServer
  } = props;

  // const [percent, setPercent] = React.useState<number | undefined>(undefined);
  const percent = useRef<number | undefined>(undefined);
  const timer = useRef(null);
  const openedFile = openedFiles[0];
  const openedFilePath = useRef(openedFile.path);
  // const [currentEntry, setCurrentEntry] = useState<OpenedEntry>(openedFile);

  const [isPropertiesPanelVisible, setPropertiesPanelVisible] = useState<
    boolean
  >(false);

  const [isRevisionPanelVisible, setRevisionPanelVisible] = useState<boolean>(
    false
  );
  const [isFullscreen, setFullscreen] = useState<boolean>(false);
  // eslint-disable-next-line no-unused-vars
  const [ignored, forceUpdate] = useReducer(x => x + 1, 0);
  // const [editingSupported, setEditingSupported] = useState<boolean>(true);
  const [
    isSaveBeforeCloseConfirmDialogOpened,
    setSaveBeforeCloseConfirmDialogOpened
  ] = useState<boolean>(false);
  const [
    isSaveBeforeReloadConfirmDialogOpened,
    setSaveBeforeReloadConfirmDialogOpened
  ] = useState<boolean>(false);
  const [isEditTagsModalOpened, setEditTagsModalOpened] = useState<boolean>(
    false
  );
  const [isConflictDialogOpen, setConflictDialogOpen] = useState<boolean>(
    false
  );
  const [isDeleteEntryModalOpened, setDeleteEntryModalOpened] = useState<
    boolean
  >(false);
  const [isSavingInProgress, setSavingInProgress] = useState<boolean>(false);
  const fileViewer: MutableRefObject<HTMLIFrameElement> = useRef<
    HTMLIFrameElement
  >(null);
  const fileViewerContainer: MutableRefObject<HTMLDivElement> = useRef<
    HTMLDivElement
  >(null);
  const fileChanged = useRef<boolean>(false);
  const eventID = useRef<string>(getUuid());
  const firstRender = useFirstRender();

  useEventListener('message', e => {
    if (typeof e.data === 'string') {
      // console.log(e.data);
      try {
        const dataObj = JSON.parse(e.data);
        if (dataObj.eventID === eventID.current) {
          handleMessage(dataObj);
        }
      } catch (ex) {
        console.debug(
          'useEventListener message:' + e.data + ' parse error:',
          ex
        );
      }
    }
  });

  const handleFullscreenChange = useCallback(e => {
    let change = '';
    if (fscreen.fullscreenElement !== null) {
      change = 'Entered fullscreen mode';
      setFullscreen(true);
      if (
        fileViewer &&
        fileViewer.current &&
        fileViewer.current.contentWindow
      ) {
        try {
          // @ts-ignore
          fileViewer.current.contentWindow.enterFullscreen();
        } catch (ex) {
          console.error('err:', ex);
        }
      }
    } else {
      change = 'Exited fullscreen mode';
      setFullscreen(false);
      if (
        fileViewer &&
        fileViewer.current &&
        fileViewer.current.contentWindow
      ) {
        try {
          // @ts-ignore
          fileViewer.current.contentWindow.exitFullscreen();
        } catch (ex) {
          console.error('err:', ex);
        }
      }
    }
    console.log(change, e);
  }, []);

  const handleFullscreenError = useCallback(e => {
    console.log('Fullscreen Error', e);
  }, []);

  const toggleFullScreen = useCallback(() => {
    if (isFullscreen) {
      fscreen.exitFullscreen();
    } else {
      fscreen.requestFullscreen(fileViewerContainer.current);
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (fscreen.fullscreenEnabled) {
      fscreen.addEventListener(
        'fullscreenchange',
        handleFullscreenChange,
        false
      );
      fscreen.addEventListener('fullscreenerror', handleFullscreenError, false);
      return () => {
        fscreen.removeEventListener('fullscreenchange', handleFullscreenChange);
        fscreen.removeEventListener('fullscreenerror', handleFullscreenError);
      };
    }
  });

  useEffect(() => {
    if (openedFile.isAutoSaveEnabled) {
      if (fileChanged.current) {
        timer.current = setInterval(() => {
          if (openedFile.isAutoSaveEnabled && fileChanged.current) {
            startSavingFile();
            console.debug('autosave');
          }
        }, AppConfig.autoSaveInterval);
      } else if (timer.current) {
        clearInterval(timer.current);
      }
    } else if (timer.current) {
      clearInterval(timer.current);
    }
    return () => {
      if (timer.current) {
        clearInterval(timer.current);
      }
    };
  }, [openedFile.isAutoSaveEnabled, fileChanged.current]);

  useEffect(() => {
    if (
      fileViewer &&
      fileViewer.current &&
      fileViewer.current.contentWindow &&
      // @ts-ignore
      fileViewer.current.contentWindow.setTheme
    ) {
      // @ts-ignore call setContent from iframe
      fileViewer.current.contentWindow.setTheme(settings.currentTheme);
    }
  }, [settings.currentTheme]);

  useEffect(() => {
    // if (openedFiles.length > 0) {
    if (
      !firstRender &&
      // openedFile.editMode &&
      // openedFile.changed &&
      fileChanged.current
      // openedFile.shouldReload === false
    ) {
      setSaveBeforeReloadConfirmDialogOpened(true);
    }
  }, [openedFilePath.current, isReadOnlyMode]); // , settings]);

  // always open for dirs
  const isPropPanelVisible = openedFile.isFile
    ? isPropertiesPanelVisible
    : true;

  const editingSupported: boolean =
    !isReadOnlyMode &&
    openedFile.editingExtensionId !== undefined &&
    openedFile.editingExtensionId.length > 3;

  const haveBookmark =
    Pro && Pro.bookmarks && Pro.bookmarks.haveBookmark(openedFile.path);

  let sharingLink = '';
  let sharingParentFolderLink = '';
  if (window.location.href.indexOf('?') > 0) {
    const sharingURL = new URL(window.location.href);
    const params = new URLSearchParams(sharingURL.search);
    if (params.has('tslid')) {
      const locationId = params.get('tslid');
      //if (params.has('tsdpath')) {
      // const folderPath2 = params.get('tsdpath');
      const folderLocation = props.locations.find(
        location => location.uuid === locationId
      );
      const folderPath = extractContainingDirectoryPath(openedFile.path);
      if (folderPath.indexOf(folderLocation.path) === 0) {
        sharingParentFolderLink = generateSharingLink(
          locationId,
          undefined,
          cleanRootPath(
            folderPath,
            folderLocation.path,
            PlatformIO.getDirSeparator()
          )
        );
      }

      //}
      if (params.has('tsepath')) {
        const entryPath = params.get('tsepath');
        if (openedFile.isFile) {
          sharingLink = generateSharingLink(locationId, entryPath);
        } else {
          sharingLink = generateSharingLink(locationId, undefined, entryPath);
        }
      } else {
        sharingLink = generateSharingLink(locationId);
      }
    }
  }

  const handleMessage = (data: any) => {
    let message;
    let textFilePath;
    switch (data.command) {
      case 'showAlertDialog':
        message = data.title ? data.title : '';
        if (data.message) {
          message = message + ': ' + data.message;
        }
        showNotification(message, NotificationTypes.default);
        break;
      case 'saveDocument':
        savingFile(data.force !== undefined ? data.force : false);
        break;
      case 'editDocument':
        if (editingSupported) {
          editFile();
        }
        break;
      case 'playbackEnded':
        openNextFile();
        break;
      // case 'openLinkExternally':
      //   // openLink(data.link);
      //   break;
      case 'loadDefaultTextContent':
        if (!openedFile || !openedFile.path) {
          // || openedFile.changed) {
          break;
        }
        textFilePath = openedFile.path;

        if (
          fileViewer &&
          fileViewer.current &&
          fileViewer.current.contentWindow &&
          // @ts-ignore
          fileViewer.current.contentWindow.setTheme
        ) {
          // @ts-ignore call setContent from iframe
          fileViewer.current.contentWindow.setTheme(settings.currentTheme);
        }
        // TODO make loading index.html for folders configurable
        // if (!this.state.currentEntry.isFile) {
        //   textFilePath += '/index.html';
        // }
        props
          .switchLocationType(openedFile.locationId)
          .then(currentLocationId => {
            PlatformIO.loadTextFilePromise(
              textFilePath,
              data.preview ? data.preview : false
            )
              .then(content => {
                const UTF8_BOM = '\ufeff';
                if (content.indexOf(UTF8_BOM) === 0) {
                  // eslint-disable-next-line no-param-reassign
                  content = content.substr(1);
                }
                let fileDirectory = extractContainingDirectoryPath(
                  textFilePath,
                  PlatformIO.getDirSeparator()
                );
                if (AppConfig.isWeb) {
                  fileDirectory =
                    extractContainingDirectoryPath(
                      // eslint-disable-next-line no-restricted-globals
                      location.href,
                      PlatformIO.getDirSeparator()
                    ) +
                    '/' +
                    fileDirectory;
                }
                if (
                  fileViewer &&
                  fileViewer.current &&
                  fileViewer.current.contentWindow &&
                  // @ts-ignore
                  fileViewer.current.contentWindow.setContent
                ) {
                  // @ts-ignore call setContent from iframe
                  fileViewer.current.contentWindow.setContent(
                    content,
                    fileDirectory,
                    !openedFile.editMode
                  );
                }
                if (currentLocationId) {
                  return props.switchCurrentLocationType(currentLocationId);
                }
              })
              .catch(err => {
                console.warn('Error loading text content ' + err);
                if (currentLocationId) {
                  return props.switchCurrentLocationType(currentLocationId);
                }
              });
          });
        break;
      case 'contentChangedInEditor': {
        if (!fileChanged.current) {
          fileChanged.current = true;
          // to render DOT before file name (only first time)
          forceUpdate();
        }
        break;
      }
      default:
        console.log(
          'Not recognized messaging command: ' + JSON.stringify(data)
        );
        break;
    }
  };

  const reloadDocument = () => {
    if (openedFile) {
      if (openedFile.editMode && fileChanged.current) {
        // openedFile.changed) {
        setSaveBeforeReloadConfirmDialogOpened(true);
      } else {
        const metaFilePath = openedFile.isFile
          ? getMetaFileLocationForFile(
              openedFile.path,
              PlatformIO.getDirSeparator()
            )
          : getMetaFileLocationForDir(
              openedFile.path,
              PlatformIO.getDirSeparator()
            );
        try {
          loadJSONFile(metaFilePath)
            .then(fsEntryMeta => {
              updateOpenedFile(openedFile.path, {
                ...fsEntryMeta,
                editMode: false,
                shouldReload: !openedFile.shouldReload
              });
            })
            .catch(() =>
              updateOpenedFile(openedFile.path, {
                ...openedFile,
                editMode: false,
                shouldReload: !openedFile.shouldReload
              })
            );
        } catch (e) {
          updateOpenedFile(openedFile.path, {
            ...openedFile,
            editMode: false,
            shouldReload: !openedFile.shouldReload
          });
        }
      }
    }
  };

  const startClosingFile = event => {
    if (event) {
      event.preventDefault(); // Let's stop this event.
      event.stopPropagation();
    }
    if (openedFile && fileChanged.current && openedFile.editMode) {
      // openedFile.changed
      setSaveBeforeCloseConfirmDialogOpened(true);
    } else {
      closeFile();
    }
  };

  const closeFile = () => {
    closeAllFiles();
    // setEditingSupported(false);
  };

  const startSavingFile = () => savingFile();

  function savingFile(force = false) {
    if (
      fileViewer &&
      fileViewer.current &&
      fileViewer.current.contentWindow &&
      // @ts-ignore
      fileViewer.current.contentWindow.getContent
    ) {
      try {
        //check if file is changed
        if (fileChanged.current || force) {
          setSavingInProgress(true);
          saveFile().then(success => {
            if (success) {
              fileChanged.current = false;
              // showNotification(
              //   i18n.t('core:fileSavedSuccessfully'),
              //   NotificationTypes.default
              // );
            }
            // change state will not render DOT before file name too
            setSavingInProgress(false);
          });
        }
      } catch (e) {
        setSavingInProgress(false);
        console.debug('function getContent not exist for video file:', e);
      }
    }
  }

  const override = (): Promise<boolean> => {
    return props
      .switchLocationType(openedFile.locationId)
      .then(currentLocationId =>
        PlatformIO.getPropertiesPromise(
          openedFile.path
        ).then((entryProp: TS.FileSystemEntry) =>
          save({ ...openedFile, lmdt: entryProp.lmdt }).then(() =>
            props.switchCurrentLocationType(currentLocationId)
          )
        )
      );
  };

  const saveAs = (newFilePath: string): Promise<boolean> => {
    return props
      .switchLocationType(openedFile.locationId)
      .then(currentLocationId =>
        PlatformIO.copyFilePromise(openedFile.path, newFilePath).then(() =>
          PlatformIO.getPropertiesPromise(newFilePath).then(
            (entryProp: TS.FileSystemEntry) =>
              save({
                ...openedFile,
                path: entryProp.path,
                lmdt: entryProp.lmdt
              }).then(() => {
                const openedFileDir = extractContainingDirectoryPath(
                  entryProp.path
                );
                if (currentDirectoryPath === openedFileDir) {
                  props.loadDirectoryContent(
                    openedFileDir,
                    true,
                    true
                  ); /*
                  updateOpenedFile(openedFile.path, {
                    ...openedFile,
                    editMode: false,
                    shouldReload: !openedFile.shouldReload
                  });*/
                }
                return props.switchCurrentLocationType(currentLocationId);
              })
          )
        )
      );
  };

  const saveFile = (): Promise<boolean> => {
    return props
      .switchLocationType(openedFile.locationId)
      .then(currentLocationId =>
        save(openedFile).then(() =>
          props.switchCurrentLocationType(currentLocationId)
        )
      );
  };

  async function save(fileOpen: OpenedEntry): Promise<boolean> {
    // @ts-ignore
    const textContent = fileViewer.current.contentWindow.getContent();
    if (Pro && props.revisionsEnabled) {
      const id = await Pro.MetaOperations.getMetadataID(
        fileOpen.path,
        fileOpen.uuid
      );
      const targetPath = getBackupFileLocation(
        fileOpen.path,
        id,
        PlatformIO.getDirSeparator()
      );
      try {
        await PlatformIO.copyFilePromiseOverwrite(fileOpen.path, targetPath); // todo test what happened if remove await?
      } catch (error) {
        console.error('copyFilePromiseOverwrite', error);
      }
    }
    return PlatformIO.saveTextFilePromise(
      { path: fileOpen.path, lmdt: fileOpen.lmdt },
      textContent,
      true
    )
      .then(() => {
        if (Pro) {
          Pro.history.saveHistory(
            historyKeys.fileEditKey,
            {
              path: fileOpen.path,
              url: fileOpen.url,
              lid: fileOpen.locationId
            },
            settings[historyKeys.fileEditKey]
          );
        }

        return updateOpenedFile(fileOpen.path, {
          ...fileOpen,
          editMode: true,
          changed: false,
          shouldReload: undefined
        }).then(() => true);
      })
      .catch(error => {
        setConflictDialogOpen(true);
        console.log('Error saving file ' + fileOpen.path + ' - ' + error);
        return false;
      });
  }

  const editFile = () => {
    props.switchLocationType(openedFile.locationId).then(currentLocationId => {
      updateOpenedFile(openedFile.path, {
        ...openedFile,
        editMode: true,
        shouldReload: undefined
      }).then(() => {
        props.switchCurrentLocationType(currentLocationId);
      });
    });
  };

  const shareFile = (filePath: string) => {
    PlatformIO.shareFiles([filePath]);
  };

  const setPercent = (p: number | undefined) => {
    percent.current = p;
    // console.log('Percent ' + percent.current);
    if (p !== undefined) {
      bufferedSplitResize(() => {
        // Threshold >10% for automatically close Properties panel
        if (p <= 10) {
          // parseInt(defaultSplitSize, 10)) {
          closePanel();
        } else {
          if (settings.entrySplitSize !== p + '%') {
            setEntryPropertiesSplitSize(p + '%');
          }
          openPanel();
        }
      });
    }
    forceUpdate();
  };

  const openPanel = () => {
    if (!isPropertiesPanelVisible) {
      percent.current = parseFloat(settings.entrySplitSize);
      setPropertiesPanelVisible(true);
    }
  };

  const closePanel = () => {
    if (isPropertiesPanelVisible) {
      percent.current = undefined;
      setPropertiesPanelVisible(false);
    }
  };

  const toggleProperties = () => {
    if (isPropPanelVisible && !isRevisionPanelVisible) {
      closePanel();
    } else {
      openPanel();
    }

    if (isRevisionPanelVisible) {
      setRevisionPanelVisible(false);
    }
  };

  const toggleRevisions = () => {
    if (isRevisionPanelVisible) {
      setRevisionPanelVisible(false);
      closePanel();
    } else {
      setRevisionPanelVisible(true);
      openPanel();
    }
  };

  const openNextFile = () => {
    props.openNextFile(openedFile.path);
  };

  const openPrevFile = () => {
    props.openPrevFile(openedFile.path);
  };

  const bookmarkClick = () => {
    if (Pro) {
      if (haveBookmark) {
        Pro.bookmarks.delBookmark(openedFile.path);
      } else {
        Pro.bookmarks.setBookmark(openedFile.path, sharingLink);
      }
      forceUpdate();
    } else {
      showNotification(
        i18n.t('core:toggleBookmark') +
          ' - ' +
          i18n.t('thisFunctionalityIsAvailableInPro'),
        NotificationTypes.default
      );
    }
  };

  const openNatively = () => {
    if (openedFile.path) {
      if (openedFile.isFile) {
        openFileNatively(openedFile.path);
      } else {
        openDirectory(openedFile.path);
      }
    }
  };

  const navigateToFolder = () => {
    // let folderPath = '';
    if (openedFile.isFile) {
      // folderPath = extractContainingDirectoryPath(openedFile.path);
      openLink(sharingParentFolderLink);
    } else {
      openLink(sharingLink);
      // folderPath = openedFile.path;
    }
    // loadDirectoryContent(folderPath, false, true);
  };

  const openInNewWindow = () => {
    PlatformIO.createNewInstance(window.location.href);
  };

  const downloadCordova = (uri, filename) => {
    const { Downloader } = window.plugins;

    const downloadSuccessCallback = result => {
      // result is an object
      /* {
        path: "file:///storage/sdcard0/documents/My Pdf.pdf", // Returns full file path
        file: "My Pdf.pdf", // Returns Filename
        folder: "documents" // Returns folder name
      } */
      console.log(result.file); // My Pdf.pdf
    };

    const downloadErrorCallback = error => {
      console.log(error);
    };

    const options = {
      title: 'Downloading File:' + filename, // Download Notification Title
      url: uri, // File Url
      path: filename, // The File Name with extension
      description: 'The file is downloading', // Download description Notification String
      visible: true, // This download is visible and shows in the notifications while in progress and after completion.
      folder: 'documents' // Folder to save the downloaded file, if not exist it will be created
    };

    Downloader.download(
      options,
      downloadSuccessCallback,
      downloadErrorCallback
    );
  };

  const isEditable = AppConfig.editableFiles.some(ext =>
    openedFile.path.endsWith(ext)
  );

  const toggleAutoSave = (event: React.ChangeEvent<HTMLInputElement>) => {
    const autoSave = event.target.checked;
    if (Pro && Pro.MetaOperations) {
      props
        .switchLocationType(openedFile.locationId)
        .then(currentLocationId => {
          Pro.MetaOperations.saveFsEntryMeta(openedFile.path, {
            autoSave
          }).then(entryMeta => {
            updateOpenedFile(openedFile.path, entryMeta).then(() => {
              props.switchCurrentLocationType(currentLocationId);
            });
          });
        });
    } else {
      showNotification(
        i18n.t('core:thisFunctionalityIsAvailableInPro'),
        NotificationTypes.default
      );
    }
  };

  const renderFileToolbar = classes => (
    <div className={classes.toolbar2}>
      <div className={classes.flexLeft}>
        <Tooltip title={i18n.t('core:toggleProperties')}>
          <IconButton
            aria-label={i18n.t('core:toggleProperties')}
            onClick={toggleProperties}
            data-tid="fileContainerToggleProperties"
            size="large"
          >
            <DetailsIcon
              color={
                isPropPanelVisible && !isRevisionPanelVisible
                  ? 'primary'
                  : 'action'
              }
            />
          </IconButton>
        </Tooltip>
        {Pro && isEditable && props.revisionsEnabled && (
          <Tooltip title={i18n.t('core:revisions')}>
            <IconButton
              aria-label={i18n.t('core:revisions')}
              onClick={toggleRevisions}
              data-tid="revisionsTID"
              size="large"
            >
              <HistoryIcon
                color={isRevisionPanelVisible ? 'primary' : 'action'}
              />
            </IconButton>
          </Tooltip>
        )}
        <Divider orientation="vertical" flexItem />
        <Tooltip title={i18n.t('core:downloadFile')}>
          <IconButton
            aria-label={i18n.t('core:downloadFile')}
            onClick={() => {
              const entryName = `${baseName(
                openedFile.path,
                PlatformIO.getDirSeparator()
              )}`;
              const fileName = extractFileName(
                entryName,
                PlatformIO.getDirSeparator()
              );

              if (AppConfig.isCordova) {
                if (openedFile.url) {
                  downloadCordova(openedFile.url, entryName);
                } else {
                  console.log('Can only download HTTP/HTTPS URIs');
                  showNotification(
                    i18n.t('core:cantDownloadLocalFile'),
                    NotificationTypes.default
                  );
                }
              } else {
                const downloadLink = document.getElementById('downloadFile');
                if (downloadLink) {
                  if (AppConfig.isWeb) {
                    // eslint-disable-next-line no-restricted-globals
                    const { protocol } = location;
                    // eslint-disable-next-line no-restricted-globals
                    const { hostname } = location;
                    // eslint-disable-next-line no-restricted-globals
                    const { port } = location;
                    const link = `${protocol}//${hostname}${
                      port !== '' ? `:${port}` : ''
                    }/${openedFile.path}`;
                    downloadLink.setAttribute('href', link);
                  } else {
                    downloadLink.setAttribute(
                      'href',
                      `file:///${openedFile.path}`
                    );
                  }

                  if (openedFile.url) {
                    // mostly the s3 case
                    downloadLink.setAttribute('target', '_blank');
                    downloadLink.setAttribute('href', openedFile.url);
                  }

                  downloadLink.setAttribute('download', fileName); // works only for same origin
                  downloadLink.click();
                }
              }
            }}
            size="large"
          >
            <FileDownloadIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title={i18n.t('core:switchToFullscreen')}>
          <IconButton
            aria-label={i18n.t('core:switchToFullscreen')}
            data-tid="fileContainerSwitchToFullScreen"
            onClick={toggleFullScreen}
            size="large"
          >
            <FullScreenIcon />
          </IconButton>
        </Tooltip>
        {isDesktopMode && (
          <Tooltip title={i18n.t('core:openInFullWidth')}>
            <IconButton
              data-tid="openInFullWidthTID"
              aria-label={i18n.t('core:openInFullWidth')}
              onClick={() => {
                toggleEntryFullWidth();
                closePanel();
              }}
              size="large"
            >
              <ExpandIcon />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title={i18n.t('core:navigateToParentDirectory')}>
          <IconButton
            aria-label={i18n.t('core:navigateToParentDirectory')}
            onClick={navigateToFolder}
            size="large"
          >
            <ParentFolderIcon />
          </IconButton>
        </Tooltip>
        {!AppConfig.isCordova && (
          <Tooltip title={i18n.t('core:openInWindow')}>
            <IconButton
              aria-label={i18n.t('core:openInWindow')}
              onClick={openInNewWindow}
              size="large"
            >
              <OpenNewWindowIcon />
            </IconButton>
          </Tooltip>
        )}
        {AppConfig.isCordova && (
          <Tooltip title={i18n.t('core:shareFile')}>
            <IconButton
              aria-label={i18n.t('core:shareFile')}
              data-tid="shareFile"
              onClick={() => shareFile(`file:///${openedFile.path}`)}
              size="large"
            >
              <LinkIcon />
            </IconButton>
          </Tooltip>
        )}
        {!(
          PlatformIO.haveObjectStoreSupport() ||
          PlatformIO.haveWebDavSupport() ||
          AppConfig.isWeb
        ) && (
          <Tooltip title={i18n.t('core:openFileExternally')}>
            <IconButton
              aria-label={i18n.t('core:openFileExternally')}
              onClick={openNatively}
              size="large"
            >
              <OpenNativelyIcon />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title={i18n.t('core:reloadFile')}>
          <IconButton
            data-tid="reloadPropertiesTID"
            aria-label={i18n.t(
              openedFile.isFile
                ? 'core:reloadFileProperties'
                : 'core:reloadFolderProperties'
            )}
            onClick={reloadDocument}
            size="large"
          >
            <ReloadIcon />
          </IconButton>
        </Tooltip>
        {!isReadOnlyMode && (
          <Tooltip title={i18n.t('core:deleteEntry')}>
            <IconButton
              data-tid="deleteEntryTID"
              aria-label={i18n.t('core:deleteEntry')}
              onClick={() => setDeleteEntryModalOpened(true)}
              size="large"
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        )}
      </div>
      <div
        style={{
          position: 'absolute',
          top: 50,
          right: 0,
          backgroundColor: theme.palette.background.default,
          boxShadow: '-11px -2px 20px 3px ' + theme.palette.background.default
        }}
      >
        <Tooltip title={i18n.t('core:openPrevFileTooltip')}>
          <IconButton
            aria-label={i18n.t('core:openPrevFileTooltip')}
            data-tid="fileContainerPrevFile"
            onClick={openPrevFile}
            size="large"
          >
            <PrevDocumentIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title={i18n.t('core:openNextFileTooltip')}>
          <IconButton
            aria-label={i18n.t('core:openNextFileTooltip')}
            data-tid="fileContainerNextFile"
            onClick={openNextFile}
            size="large"
          >
            <NextDocumentIcon />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  );

  const renderFolderToolbar = () => (
    <div className={classes.toolbar2}>
      <div className={classes.flexLeft}>
        <Tooltip title={i18n.t('core:openInMainArea')}>
          <IconButton
            data-tid="openInMainAreaTID"
            aria-label={i18n.t('core:openInMainArea')}
            onClick={navigateToFolder}
            size="large"
          >
            <NavigateToFolderIcon />
          </IconButton>
        </Tooltip>
        {!AppConfig.isCordova && (
          <Tooltip title={i18n.t('core:openInWindow')}>
            <IconButton
              aria-label={i18n.t('core:openInWindow')}
              onClick={openInNewWindow}
              size="large"
            >
              <OpenNewWindowIcon />
            </IconButton>
          </Tooltip>
        )}
        {!(
          PlatformIO.haveObjectStoreSupport() ||
          PlatformIO.haveWebDavSupport() ||
          AppConfig.isWeb
        ) && (
          <Tooltip title={i18n.t('core:openDirectoryExternally')}>
            <IconButton
              aria-label={i18n.t('core:openDirectoryExternally')}
              onClick={openNatively}
              size="large"
            >
              <OpenNativelyIcon />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title={i18n.t('core:reloadDirectory')}>
          <IconButton
            data-tid="reloadFolderTID"
            aria-label={i18n.t('core:reloadDirectory')}
            onClick={reloadDocument}
            size="large"
          >
            <ReloadIcon />
          </IconButton>
        </Tooltip>
        {isDesktopMode && (
          <Tooltip title={i18n.t('core:openInFullWidth')}>
            <IconButton
              data-tid="openInFullWidthTID"
              aria-label={i18n.t('core:openInFullWidth')}
              onClick={() => {
                toggleEntryFullWidth();
                closePanel();
              }}
              size="large"
            >
              <ExpandIcon />
            </IconButton>
          </Tooltip>
        )}
        {!isReadOnlyMode && (
          <Tooltip title={i18n.t('core:deleteDirectory')}>
            <IconButton
              data-tid="deleteFolderTID"
              aria-label={i18n.t('core:deleteDirectory')}
              onClick={() => setDeleteEntryModalOpened(true)}
              size="large"
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        )}
      </div>
    </div>
  );

  let fileTitle: string = openedFile.path
    ? extractTitle(
        openedFile.path,
        !openedFile.isFile,
        PlatformIO.getDirSeparator()
      )
    : '';

  let fileName: string;
  if (openedFile.path) {
    if (openedFile.isFile) {
      fileName = extractFileName(openedFile.path, PlatformIO.getDirSeparator());
    } else {
      fileName = extractDirectoryName(
        openedFile.path,
        PlatformIO.getDirSeparator()
      );
    }
  }
  if (!fileName) {
    const currentLocation = props.locations.find(
      location => location.uuid === openedFile.locationId
    );
    if (currentLocation) {
      fileName = currentLocation.name;
    }
  }

  const renderPanels = () => {
    const closeButton = (
      <Tooltip title={i18n.t('core:closeEntry')}>
        <IconButton
          onClick={startClosingFile}
          aria-label={i18n.t('core:closeEntry')}
          data-tid="fileContainerCloseOpenedFile"
          size="large"
        >
          <CloseIcon />
        </IconButton>
      </Tooltip>
    );

    const toolbarButtons = () => {
      if (openedFile.path !== undefined) {
        return (
          <Box
            key="toolbarButtonsID"
            style={{
              width: '100%',
              flexDirection: 'column',
              flex: '1 1 100%',
              display: 'flex',
              backgroundColor: theme.palette.background.default,
              height: '100%' // filePropsHeight ||
            }}
          >
            <Box
              style={{
                paddingLeft: 0,
                paddingRight: 50,
                paddingTop: 0,
                minHeight: 50,
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'flex-start'
              }}
            >
              <Box
                className={classes.flexLeft}
                style={{
                  paddingLeft: 10,
                  display: 'flex',
                  alignItems: 'center',
                  paddingRight: editingSupported ? 85 : 5
                }}
              >
                <Tooltip title={fileName}>
                  <Box
                    data-tid={'OpenedTID' + dataTidFormat(fileName)}
                    style={{
                      color: theme.palette.text.primary,
                      display: 'inline',
                      fontSize: 17,
                      maxHeight: 40,
                      overflowY: 'auto'
                    }}
                  >
                    {fileTitle}
                  </Box>
                </Tooltip>
                {openedFile.isFile ? (
                  <>
                    {fileChanged.current ? (
                      <Tooltip title={i18n.t('core:fileChanged')}>
                        <span
                          style={{
                            color: theme.palette.text.primary,
                            margin: 3
                          }}
                        >
                          {String.fromCharCode(0x25cf)}
                        </span>
                      </Tooltip>
                    ) : (
                      ''
                    )}
                    <span
                      className={classes.fileBadge}
                      style={{
                        backgroundColor: openedFile.color,
                        textTransform: 'uppercase'
                      }}
                    >
                      {'.' +
                        extractFileExtension(
                          openedFile.path,
                          PlatformIO.getDirSeparator()
                        )}
                    </span>
                  </>
                ) : (
                  <span
                    className={classes.fileBadge}
                    title={i18n.t('core:toggleEntryProperties')}
                    style={{
                      backgroundColor: AppConfig.defaultFolderColor
                    }}
                  >
                    {i18n.t('core:folder')}
                  </span>
                )}
                <ProTooltip tooltip={i18n.t('core:toggleBookmark')}>
                  <IconButton
                    data-tid="toggleBookmarkTID"
                    aria-label="bookmark"
                    size="small"
                    onClick={bookmarkClick}
                  >
                    {haveBookmark ? (
                      <BookmarkIcon
                        style={{
                          color: theme.palette.primary.main
                        }}
                      />
                    ) : (
                      <BookmarkAddIcon
                        style={{
                          color: theme.palette.text.secondary
                        }}
                      />
                    )}
                  </IconButton>
                </ProTooltip>
                <TagsPreview tags={openedFile.tags} />
              </Box>
              <div
                style={{
                  zIndex: 1,
                  position: 'absolute',
                  right: 0,
                  backgroundColor: theme.palette.background.default,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {isEditable && props.revisionsEnabled && (
                  <Tooltip
                    title={
                      i18n.t('core:autosave') +
                      (!Pro
                        ? ' - ' +
                          i18n.t('core:thisFunctionalityIsAvailableInPro')
                        : '')
                    }
                  >
                    <Switch
                      data-tid="autoSaveTID"
                      checked={
                        openedFile.isAutoSaveEnabled !== undefined &&
                        openedFile.isAutoSaveEnabled
                      }
                      onChange={toggleAutoSave}
                      name="autoSave"
                      color="primary"
                    />
                  </Tooltip>
                )}

                {editingSupported && openedFile.editMode && (
                  <ButtonGroup>
                    <Tooltip title={i18n.t('core:cancelEditing')}>
                      <Button
                        onClick={reloadDocument}
                        aria-label={i18n.t('core:cancelEditing')}
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={isDesktopMode && <CancelIcon />}
                      >
                        {fileChanged.current
                          ? i18n.t('core:cancel')
                          : i18n.t('core:closeButton')}
                      </Button>
                    </Tooltip>
                    <Tooltip
                      title={
                        i18n.t('core:saveFile') +
                        ' (' +
                        (AppConfig.isMaclike ? '⌘' : 'CTRL') +
                        ' + S)'
                      }
                    >
                      <LoadingButton
                        disabled={false}
                        onClick={startSavingFile}
                        aria-label={i18n.t('core:saveFile')}
                        data-tid="fileContainerSaveFile"
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={isDesktopMode && <SaveIcon />}
                        loading={isSavingInProgress}
                      >
                        {i18n.t('core:save')}
                      </LoadingButton>
                    </Tooltip>
                  </ButtonGroup>
                )}
                {editingSupported && !openedFile.editMode && (
                  <Tooltip title={i18n.t('core:editFile')}>
                    <Button
                      disabled={false}
                      size="small"
                      variant="outlined"
                      color="primary"
                      onClick={editFile}
                      aria-label={i18n.t('core:editFile')}
                      data-tid="fileContainerEditFile"
                      startIcon={<EditIcon />}
                    >
                      {i18n.t('core:edit')}
                    </Button>
                  </Tooltip>
                )}
                {closeButton}
              </div>
            </Box>
            {entryProperties}
          </Box>
        );
      }
      return <div>{i18n.t('core:noEntrySelected')}</div>;
    };

    const entryProperties = (
      <div
        style={{
          display: 'inline',
          flex: '1 1 100%',
          backgroundColor: theme.palette.background.default,
          padding: '0',
          height: '100%'
        }}
      >
        {openedFile.isFile ? renderFileToolbar(classes) : renderFolderToolbar()}
        {isRevisionPanelVisible &&
        openedFile.isFile &&
        Pro &&
        isEditable &&
        props.revisionsEnabled ? (
          <Revisions />
        ) : (
          <EntryProperties
            key={openedFile.path}
            openedEntry={openedFile}
            tagDelimiter={settings.tagDelimiter}
            renameFile={renameFile}
            renameDirectory={renameDirectory}
            addTags={addTags}
            removeTags={removeTags}
            removeAllTags={removeAllTags}
            updateOpenedFile={updateOpenedFile}
            updateThumbnailUrl={updateThumbnailUrl}
            showNotification={showNotification}
            isReadOnlyMode={isReadOnlyMode}
            currentDirectoryPath={currentDirectoryPath}
            tileServer={tileServer}
            sharingLink={sharingLink}
          />
        )}
      </div>
    );

    let initSize;
    if (isPropPanelVisible) {
      initSize = openedFile.isFile ? settings.entrySplitSize : '100%';
    } else {
      initSize = defaultSplitSize; // '0%';
    }

    return (
      <Split
        horizontal
        minPrimarySize="98px"
        initialPrimarySize={initSize}
        percent={percent.current}
        setPercent={setPercent}
      >
        {toolbarButtons()}
        <FileView
          key="FileViewID"
          openedFile={openedFiles[0]}
          isFullscreen={isFullscreen}
          fileViewer={fileViewer}
          fileViewerContainer={fileViewerContainer}
          toggleFullScreen={toggleFullScreen}
          currentTheme={settings.currentTheme}
          eventID={eventID.current}
        />
      </Split>
    );
  };

  return (
    <GlobalHotKeys
      handlers={{
        closeViewer: startClosingFile,
        saveDocument: startSavingFile,
        editDocument: editFile,
        nextDocument: openNextFile,
        prevDocument: openPrevFile,
        toggleFullScreen
      }}
      keyMap={{
        nextDocument: keyBindings.nextDocument,
        prevDocument: keyBindings.prevDocument,
        closeViewer: keyBindings.closeViewer,
        saveDocument: keyBindings.saveDocument,
        editDocument: keyBindings.editDocument,
        toggleFullScreen: keyBindings.toggleFullScreen
      }}
    >
      {isSaveBeforeCloseConfirmDialogOpened && (
        <ConfirmDialog
          open={isSaveBeforeCloseConfirmDialogOpened}
          onClose={() => {
            setSaveBeforeCloseConfirmDialogOpened(false);
          }}
          title={i18n.t('core:confirm')}
          content={i18n.t('core:saveFileBeforeClosingFile')}
          confirmCallback={result => {
            if (result) {
              startSavingFile();
            } else {
              closeFile();
              setSaveBeforeCloseConfirmDialogOpened(false);
            }
          }}
          cancelDialogTID="cancelSaveBeforeCloseDialog"
          confirmDialogTID="confirmSaveBeforeCloseDialog"
          confirmDialogContentTID="confirmDialogContent"
        />
      )}
      {isSaveBeforeReloadConfirmDialogOpened && (
        <ConfirmDialog
          open={isSaveBeforeReloadConfirmDialogOpened}
          onClose={() => {
            setSaveBeforeReloadConfirmDialogOpened(false);
          }}
          title={i18n.t('core:confirm')}
          content="File was modified, do you want to save the changes?"
          confirmCallback={result => {
            if (result) {
              setSaveBeforeReloadConfirmDialogOpened(false);
              startSavingFile();
            } else {
              setSaveBeforeReloadConfirmDialogOpened(false);
              updateOpenedFile(openedFile.path, {
                ...openedFile,
                editMode: false,
                // changed: false,
                shouldReload: true
              });
              fileChanged.current = false;
            }
          }}
          cancelDialogTID="cancelSaveBeforeCloseDialog"
          confirmDialogTID="confirmSaveBeforeCloseDialog"
          confirmDialogContentTID="confirmDialogContent"
        />
      )}
      {isDeleteEntryModalOpened && (
        <ConfirmDialog
          open={isDeleteEntryModalOpened}
          onClose={() => {
            setDeleteEntryModalOpened(false);
          }}
          title={
            openedFile.isFile
              ? i18n.t('core:deleteConfirmationTitle')
              : i18n.t('core:deleteDirectory')
          }
          content={
            openedFile.isFile
              ? i18n.t('core:doYouWantToDeleteFile')
              : i18n.t('core:deleteDirectoryContentConfirm', {
                  dirPath: openedFile.path
                    ? extractDirectoryName(
                        openedFile.path,
                        PlatformIO.getDirSeparator()
                      )
                    : ''
                })
          }
          confirmCallback={result => {
            if (result) {
              deleteFile(openedFile.path, openedFile.uuid);
            }
          }}
          cancelDialogTID="cancelSaveBeforeCloseDialog"
          confirmDialogTID="confirmSaveBeforeCloseDialog"
          confirmDialogContentTID="confirmDialogContent"
        />
      )}
      {isEditTagsModalOpened && (
        <AddRemoveTagsDialog
          open={isEditTagsModalOpened}
          onClose={() => setEditTagsModalOpened(false)}
          removeTags={removeTags}
          removeAllTags={removeAllTags}
          selectedEntries={openedFile ? [openedFile] : []}
        />
      )}
      <ResolveConflictDialog
        open={isConflictDialogOpen}
        onClose={() => setConflictDialogOpen(false)}
        file={openedFile}
        saveAs={saveAs}
        override={override}
      />
      {/* eslint-disable-next-line jsx-a11y/anchor-has-content,jsx-a11y/anchor-is-valid */}
      <a href="#" id="downloadFile" />
      {renderPanels()}
    </GlobalHotKeys>
  );
}

function mapStateToProps(state) {
  return {
    settings: state.settings,
    isReadOnlyMode: isReadOnlyMode(state),
    keyBindings: getKeyBindingObject(state),
    isDesktopMode: isDesktopMode(state),
    tileServer: getMapTileServer(state),
    revisionsEnabled: isRevisionsEnabled(state),
    language: getCurrentLanguage(state),
    locations: getLocations(state)
  };
}

function mapActionCreatorsToProps(dispatch) {
  return bindActionCreators(
    {
      setEntryPropertiesSplitSize: SettingsActions.setEntryPropertiesSplitSize,
      closeAllFiles: AppActions.closeAllFiles,
      renameFile: AppActions.renameFile,
      renameDirectory: AppActions.renameDirectory,
      openFsEntry: AppActions.openFsEntry,
      openFileNatively: AppActions.openFileNatively,
      openDirectory: AppActions.openDirectory,
      openLink: AppActions.openLink,
      showNotification: AppActions.showNotification,
      openNextFile: AppActions.openNextFile,
      openPrevFile: AppActions.openPrevFile,
      deleteFile: AppActions.deleteFile,
      toggleEntryFullWidth: AppActions.toggleEntryFullWidth,
      addTags: TaggingActions.addTags,
      removeTags: TaggingActions.removeTags,
      removeAllTags: TaggingActions.removeAllTags,
      updateOpenedFile: AppActions.updateOpenedFile,
      updateThumbnailUrl: AppActions.updateThumbnailUrl,
      switchLocationType: LocationActions.switchLocationType,
      switchCurrentLocationType: AppActions.switchCurrentLocationType
    },
    dispatch
  );
}
const areEqual = (prevProp, nextProp) =>
  // JSON.stringify(nextProp.theme) === JSON.stringify(prevProp.theme) &&
  nextProp.language === prevProp.language &&
  nextProp.settings.currentTheme === prevProp.settings.currentTheme &&
  nextProp.settings.entrySplitSize === prevProp.settings.entrySplitSize &&
  JSON.stringify(nextProp.openedFiles) === JSON.stringify(prevProp.openedFiles);
/* nextProp.openedFiles[0].path === prevProp.openedFiles[0].path &&
  nextProp.openedFiles[0].shouldReload ===
    prevProp.openedFiles[0].shouldReload &&
  nextProp.openedFiles[0].editMode === prevProp.openedFiles[0].editMode; */

export default connect(
  mapStateToProps,
  mapActionCreatorsToProps
)(
  // @ts-ignore
  React.memo(withStyles(styles, { withTheme: true })(EntryContainer), areEqual)
);
