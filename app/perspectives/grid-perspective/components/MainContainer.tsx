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

import React, { useEffect, useReducer, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { GlobalHotKeys } from 'react-hotkeys';
import { isObj, sortByCriteria } from '@tagspaces/tagspaces-common/misc';
import { isVisibleOnScreen } from '-/utils/dom';
import { getDesktopMode, getKeyBindingObject } from '-/reducers/settings';
import FileMenu from '-/components/menus/FileMenu';
import DirectoryMenu from '-/components/menus/DirectoryMenu';
import EntryTagMenu from '-/components/menus/EntryTagMenu';
//import i18n from '-/services/i18n';
import AddRemoveTagsDialog from '-/components/dialogs/AddRemoveTagsDialog';
import MoveCopyFilesDialog from '-/components/dialogs/MoveCopyFilesDialog';
import TagDropContainer from '-/components/TagDropContainer';
import IOActions from '-/reducers/io-actions';
import {
  actions as AppActions,
  AppDispatch,
  getDirectoryMeta,
  getEditedEntryPaths,
  getLastSelectedEntryPath,
  getSearchFilter,
  getSelectedEntries,
  isReadOnlyMode
} from '-/reducers/app';
import CellContent from './CellContent';
import MainToolbar from './MainToolbar';
import SortingMenu from './SortingMenu';
import GridOptionsMenu from './GridOptionsMenu';
import { getCurrentLocation } from '-/reducers/locations';
import PlatformIO from '-/services/platform-facade';
import GridPagination from '-/perspectives/grid-perspective/components/GridPagination';
import GridSettingsDialog from '-/perspectives/grid-perspective/components/GridSettingsDialog';
import AddTagToTagGroupDialog from '-/components/dialogs/AddTagToTagGroupDialog';
import { TS } from '-/tagspaces.namespace';
import { Pro } from '-/pro';
import Links from '-/content/links';
import { defaultSettings } from '../index';
import { PerspectiveIDs } from '-/perspectives';
import { fileOperationsEnabled } from '-/perspectives/common/main-container';
import GlobalSearch from '-/services/search-index';
import useFirstRender from '-/utils/useFirstRender';
import { openURLExternally } from '-/services/utils-io';

interface Props {
  currentDirectoryPath: string;
  openFsEntry: (fsEntry?: TS.FileSystemEntry) => void;
  openRenameEntryDialog: () => void;
  loadDirectoryContent: (
    path: string,
    generateThumbnails: boolean,
    loadDirMeta?: boolean
  ) => void;
  openDirectory: (path: string) => void;
  showInFileManager: (path: string) => void;
  loadParentDirectoryContent: () => void;
  removeTags: (paths: Array<string>, tags: Array<TS.Tag>) => void;
  removeAllTags: () => void;
  directoryContent: Array<TS.FileSystemEntry>;
  lastSearchTimestamp: number;
}

function getSettings(directoryMeta: TS.FileSystemEntryMeta): TS.FolderSettings {
  if (
    Pro &&
    directoryMeta &&
    directoryMeta.perspectiveSettings &&
    directoryMeta.perspectiveSettings[PerspectiveIDs.GRID]
  ) {
    return directoryMeta.perspectiveSettings[PerspectiveIDs.GRID];
  } else {
    // loading settings for not Pro
    return JSON.parse(localStorage.getItem(defaultSettings.settingsKey));
  }
}

function GridPerspective(props: Props) {
  const {
    loadParentDirectoryContent,
    currentDirectoryPath,
    openRenameEntryDialog,
    directoryContent,
    lastSearchTimestamp,
    openFsEntry,
    loadDirectoryContent,
    removeTags,
    removeAllTags,
    showInFileManager,
    openDirectory
  } = props;

  const directoryMeta: TS.FileSystemEntryMeta = useSelector(getDirectoryMeta);
  const readOnlyMode = useSelector(isReadOnlyMode);
  const desktopMode = useSelector(getDesktopMode);
  const selectedEntries: Array<TS.FileSystemEntry> = useSelector(
    getSelectedEntries
  );
  const lastSelectedEntryPath = useSelector(getLastSelectedEntryPath);
  const keyBindings = useSelector(getKeyBindingObject);
  const currentLocation: TS.Location = useSelector(getCurrentLocation);
  const searchFilter: string = useSelector(getSearchFilter);
  const editedEntryPaths: Array<TS.EditedEntryPath> = useSelector(
    getEditedEntryPaths
  );

  const dispatch: AppDispatch = useDispatch();

  // Create functions that dispatch actions
  const handleMoveFiles = (files: Array<string>, destination: string) =>
    dispatch(IOActions.moveFiles(files, destination));

  const handleSetSelectedEntries = (entries: Array<TS.FileSystemEntry>) => {
    dispatch(AppActions.setSelectedEntries(entries));
  };

  const handleShowNotification = (
    text: string,
    notificationType: string,
    autohide: boolean
  ) => {
    dispatch(AppActions.showNotification(text, notificationType, autohide));
  };

  const handleOpenFileNatively = (path?: string) => {
    dispatch(AppActions.openFileNatively(path));
  };

  const isLocal =
    Pro &&
    directoryMeta &&
    directoryMeta.perspectiveSettings &&
    directoryMeta.perspectiveSettings[PerspectiveIDs.GRID];
  const settings = getSettings(directoryMeta);

  const ShareFilesDialog = Pro && Pro.UI ? Pro.UI.ShareFilesDialog : false;

  const [mouseX, setMouseX] = useState<number>(undefined);
  const [mouseY, setMouseY] = useState<number>(undefined);
  // const selectedEntry = useRef<FileSystemEntry>(undefined);
  const selectedEntryPath = useRef<string>(undefined);
  const selectedTag = useRef<TS.Tag | null>(null);
  const [
    fileContextMenuAnchorEl,
    setFileContextMenuAnchorEl
  ] = useState<null | HTMLElement>(null);
  const [
    dirContextMenuAnchorEl,
    setDirContextMenuAnchorEl
  ] = useState<null | HTMLElement>(null);
  const [
    tagContextMenuAnchorEl,
    setTagContextMenuAnchorEl
  ] = useState<null | HTMLElement>(null);
  const [
    sortingContextMenuAnchorEl,
    setSortingContextMenuAnchorEl
  ] = useState<null | HTMLElement>(null);
  const [
    optionsContextMenuAnchorEl,
    setOptionsContextMenuAnchorEl
  ] = useState<null | HTMLElement>(null);
  const [isAddTagDialogOpened, setIsAddTagDialogOpened] = useState<TS.Tag>(
    undefined
  );
  const sortBy = useRef<string>(
    settings && settings.sortBy ? settings.sortBy : defaultSettings.sortBy
  );
  const orderBy = useRef<null | boolean>(
    settings && typeof settings.orderBy !== 'undefined'
      ? settings.orderBy
      : defaultSettings.orderBy
  );
  const sortedDirContent = useRef<Array<TS.FileSystemEntry>>(
    !lastSearchTimestamp
      ? directoryContent
      : GlobalSearch.getInstance().getResults()
  );
  const layoutType = useRef<string>(
    settings && settings.layoutType
      ? settings.layoutType
      : defaultSettings.layoutType
  );
  const singleClickAction = useRef<string>(
    settings && settings.singleClickAction
      ? settings.singleClickAction
      : defaultSettings.singleClickAction
  );
  const entrySize = useRef<string>(
    settings && settings.entrySize
      ? settings.entrySize
      : defaultSettings.entrySize
  );
  const thumbnailMode = useRef<string>(
    settings && settings.thumbnailMode
      ? settings.thumbnailMode
      : defaultSettings.thumbnailMode
  );
  const showDirectories = useRef<boolean>(
    settings && typeof settings.showDirectories !== 'undefined'
      ? settings.showDirectories
      : defaultSettings.showDirectories
  );
  const showDetails = useRef<boolean>(
    settings && typeof settings.showDetails !== 'undefined'
      ? settings.showDetails
      : defaultSettings.showDetails
  );
  const showDescription = useRef<boolean>(
    settings && typeof settings.showDescription !== 'undefined'
      ? settings.showDescription
      : defaultSettings.showDescription
  );
  const showEntriesDescription = useRef<boolean>(
    settings && typeof settings.showEntriesDescription !== 'undefined'
      ? settings.showEntriesDescription
      : defaultSettings.showEntriesDescription
  );
  const showTags = useRef<boolean>(
    settings && typeof settings.showTags !== 'undefined'
      ? settings.showTags
      : defaultSettings.showTags
  );
  const [
    isMoveCopyFilesDialogOpened,
    setIsMoveCopyFilesDialogOpened
  ] = useState<boolean>(false);
  const [isShareFilesDialogOpened, setIsShareFilesDialogOpened] = useState<
    boolean
  >(false);
  const [
    isAddRemoveTagsDialogOpened,
    setIsAddRemoveTagsDialogOpened
  ] = useState<boolean>(false);
  const [isGridSettingsDialogOpened, setIsGridSettingsDialogOpened] = useState<
    boolean
  >(false);
  const gridPageLimit = useRef<number>(
    settings && settings.gridPageLimit
      ? settings.gridPageLimit
      : defaultSettings.gridPageLimit
  );
  // true: save in default settings; false: save per folder settings; undefined - dont save changes
  const isDefaultSetting = useRef<boolean>(undefined);
  const [ignored, forceUpdate] = useReducer(x => x + 1, 0);
  const firstRender = useFirstRender();

  useEffect(() => {
    if (selectedEntries.length === 1) {
      makeFirstSelectedEntryVisible();
    }
  }, [selectedEntries]);

  useEffect(() => {
    if (!firstRender) {
      sortedDirContent.current = sortByCriteria(
        searchFilter
          ? directoryContent.filter(entry =>
              entry.name.toLowerCase().includes(searchFilter.toLowerCase())
            )
          : directoryContent,
        sortBy.current,
        orderBy.current
      );
      forceUpdate();
    }
  }, [searchFilter]);

  useEffect(() => {
    if (!firstRender) {
      setSortedDirContent();
    }
  }, [
    directoryContent, // open subdirs todo rethink this (replace with useEffect for currDirPath changes only)
    sortBy.current,
    orderBy.current
  ]);

  useEffect(() => {
    if (!firstRender) {
      if (lastSearchTimestamp) {
        sortBy.current = 'byRelevance';
        // orderBy.current = false;
      } else {
        sortBy.current =
          settings && settings.sortBy
            ? settings.sortBy
            : defaultSettings.sortBy;
        orderBy.current =
          settings && typeof settings.orderBy !== 'undefined'
            ? settings.orderBy
            : defaultSettings.orderBy;
      }
      setSortedDirContent();
    }
  }, [lastSearchTimestamp]);

  function setSortedDirContent() {
    if (!lastSearchTimestamp) {
      // not in search mode
      sortedDirContent.current = sortByCriteria(
        directoryContent,
        sortBy.current,
        orderBy.current
      );
    } else {
      if (sortBy.current === 'byRelevance') {
        // initial search results is sorted by relevance
        if (orderBy.current) {
          sortedDirContent.current = GlobalSearch.getInstance().getResults();
        } else {
          sortedDirContent.current = [
            ...GlobalSearch.getInstance().getResults()
          ].reverse();
        }
      } else {
        sortedDirContent.current = sortByCriteria(
          searchFilter
            ? GlobalSearch.getInstance()
                .getResults()
                .filter(entry =>
                  entry.name.toLowerCase().includes(searchFilter.toLowerCase())
                )
            : GlobalSearch.getInstance().getResults(),
          sortBy.current,
          orderBy.current
        );
      }
    }
    forceUpdate();
  }

  useEffect(() => {
    // HANDLE (ADD/REMOVE sidecar TAGS) IN SEARCH RESULTS
    if (!firstRender && lastSearchTimestamp) {
      sortedDirContent.current = GlobalSearch.getInstance().getResults();
      forceUpdate();
    }
  }, [editedEntryPaths]);

  useEffect(() => {
    if (!firstRender) {
      const perspectiveSettings = getSettings(directoryMeta);
      showDirectories.current =
        perspectiveSettings && perspectiveSettings.showDirectories !== undefined
          ? perspectiveSettings.showDirectories
          : defaultSettings.showDirectories;
      showDescription.current =
        perspectiveSettings && perspectiveSettings.showDescription !== undefined
          ? perspectiveSettings.showDescription
          : defaultSettings.showDescription;
      showEntriesDescription.current =
        perspectiveSettings &&
        perspectiveSettings.showEntriesDescription !== undefined
          ? perspectiveSettings.showEntriesDescription
          : defaultSettings.showEntriesDescription;
      showDetails.current =
        perspectiveSettings && perspectiveSettings.showDetails !== undefined
          ? perspectiveSettings.showDetails
          : defaultSettings.showDetails;
      showTags.current =
        perspectiveSettings && perspectiveSettings.showTags !== undefined
          ? perspectiveSettings.showTags
          : defaultSettings.showTags;
      layoutType.current = defaultSettings.layoutType;
      orderBy.current =
        perspectiveSettings && perspectiveSettings.orderBy !== undefined
          ? perspectiveSettings.orderBy
          : defaultSettings.orderBy;
      sortBy.current =
        perspectiveSettings && perspectiveSettings.sortBy !== undefined
          ? perspectiveSettings.sortBy
          : defaultSettings.sortBy;
      singleClickAction.current =
        perspectiveSettings &&
        perspectiveSettings.singleClickAction !== undefined
          ? perspectiveSettings.singleClickAction
          : defaultSettings.singleClickAction;
      entrySize.current =
        perspectiveSettings && perspectiveSettings.entrySize !== undefined
          ? perspectiveSettings.entrySize
          : defaultSettings.entrySize;
      thumbnailMode.current =
        perspectiveSettings && perspectiveSettings.thumbnailMode !== undefined
          ? perspectiveSettings.thumbnailMode
          : defaultSettings.thumbnailMode;
      gridPageLimit.current =
        perspectiveSettings && perspectiveSettings.gridPageLimit !== undefined
          ? perspectiveSettings.gridPageLimit
          : defaultSettings.gridPageLimit;
      forceUpdate();
    }
  }, [directoryMeta]);

  useEffect(() => {
    if (!firstRender && isDefaultSetting.current !== undefined) {
      const perspectiveSettings = {
        showDirectories: showDirectories.current,
        showDescription: showDescription.current,
        showEntriesDescription: showEntriesDescription.current,
        showDetails: showDetails.current,
        showTags: showTags.current,
        layoutType: layoutType.current,
        orderBy: orderBy.current,
        sortBy: sortBy.current,
        singleClickAction: singleClickAction.current,
        entrySize: entrySize.current,
        thumbnailMode: thumbnailMode.current,
        gridPageLimit: gridPageLimit.current
      };
      if (Pro && !isDefaultSetting.current) {
        Pro.MetaOperations.savePerspectiveSettings(
          currentDirectoryPath,
          PerspectiveIDs.GRID,
          perspectiveSettings
        ).then((fsEntryMeta: TS.FileSystemEntryMeta) => {
          dispatch(AppActions.setDirectoryMeta(fsEntryMeta));
        });
      } else {
        localStorage.setItem(
          defaultSettings.settingsKey,
          JSON.stringify(perspectiveSettings)
        );
        forceUpdate();
      }
      isDefaultSetting.current = undefined;
    }
  }, [
    isDefaultSetting.current,
    showDirectories.current,
    showDescription.current,
    showEntriesDescription.current,
    showDetails.current,
    showTags.current,
    layoutType.current,
    orderBy.current,
    sortBy.current,
    singleClickAction.current,
    entrySize.current,
    thumbnailMode.current,
    gridPageLimit.current
  ]);

  const makeFirstSelectedEntryVisible = () => {
    if (selectedEntries && selectedEntries.length > 0) {
      try {
        const firstSelectedElement = document.querySelector(
          '[data-entry-id="' + selectedEntries[0].uuid + '"]'
        );
        if (
          isObj(firstSelectedElement) &&
          !isVisibleOnScreen(firstSelectedElement)
        ) {
          firstSelectedElement.scrollIntoView(false);
        }
      } catch (ex) {
        console.debug('makeFirstSelectedEntryVisible:', ex);
      }
    }
  };

  const handleLayoutSwitch = (type: string) => {
    layoutType.current = type;
    // forceUpdate();
  };

  const handleGridPageLimit = (limit: number) => {
    gridPageLimit.current = limit;
    // forceUpdate();
  };

  const handleSortBy = handleSort => {
    if (sortBy.current !== handleSort) {
      sortBy.current = handleSort;
    } else {
      orderBy.current = !orderBy.current;
    }
    // forceUpdate();
    setSortingContextMenuAnchorEl(null);
  };

  const handleSortingMenu = event => {
    const anchor = event ? event.currentTarget : null;
    setSortingContextMenuAnchorEl(anchor);
  };

  const handleExportCsvMenu = () => {
    if (Pro) {
      if (selectedEntries && selectedEntries.length > 0) {
        Pro.exportAsCsv.ExportAsCsv(selectedEntries);
      } else {
        Pro.exportAsCsv.ExportAsCsv(sortedDirContent.current);
      }
    }
  };

  const clearSelection = () => {
    handleSetSelectedEntries([]);
    selectedEntryPath.current = undefined;
  };

  const someFileSelected = selectedEntries.length > 1;

  const toggleSelectAllFiles = () => {
    if (someFileSelected) {
      clearSelection();
    } else {
      if (!lastSearchTimestamp) {
        handleSetSelectedEntries(directoryContent);
      } else {
        handleSetSelectedEntries(GlobalSearch.getInstance().getResults());
      }
    }
  };

  const toggleShowDirectories = () => {
    closeOptionsMenu();
    showDirectories.current = !showDirectories.current;
    // forceUpdate();
  };

  const toggleShowDetails = () => {
    closeOptionsMenu();
    showDetails.current = !showDetails.current;
  };

  const toggleShowDescription = () => {
    closeOptionsMenu();
    showDescription.current = !showDescription.current;
  };

  const toggleShowEntriesDescription = () => {
    closeOptionsMenu();
    showEntriesDescription.current = !showEntriesDescription.current;
  };

  const toggleShowTags = () => {
    closeOptionsMenu();
    showTags.current = !showTags.current;
    // forceUpdate();
  };

  const toggleThumbnailsMode = () => {
    closeOptionsMenu();
    const thumbMode = thumbnailMode.current === 'cover' ? 'contain' : 'cover';
    thumbnailMode.current = thumbMode;
    // forceUpdate();
    return thumbMode;
  };

  const changeEntrySize = size => {
    closeOptionsMenu();
    entrySize.current = size;
    // forceUpdate();
  };

  const changeSingleClickAction = singleClick => {
    closeOptionsMenu();
    singleClickAction.current = singleClick;
    // forceUpdate();
  };

  const openHelpWebPage = () => {
    closeOptionsMenu();
    openURLExternally(Links.documentationLinks.defaultPerspective);
  };

  const openSettings = () => {
    closeOptionsMenu();
    setIsGridSettingsDialogOpened(true);
  };

  const handleTagMenu = (
    event: React.ChangeEvent<HTMLInputElement>,
    tag: TS.Tag,
    entryPath: string
  ) => {
    event.preventDefault();
    event.stopPropagation();

    selectedTag.current = tag;
    selectedEntryPath.current = entryPath;
    setTagContextMenuAnchorEl(event.currentTarget);
  };

  const closeOptionsMenu = () => {
    setOptionsContextMenuAnchorEl(null);
  };

  const openMoveCopyFilesDialog = () => {
    setIsMoveCopyFilesDialogOpened(true);
  };

  const openShareFilesDialog = () => {
    setIsShareFilesDialogOpened(true);
  };

  const openDeleteFileDialog = () => {
    dispatch(AppActions.toggleDeleteMultipleEntriesDialog());
  };

  const openAddRemoveTagsDialog = () => {
    setIsAddRemoveTagsDialogOpened(true);
  };

  const keyMap = {
    nextDocument: keyBindings.nextDocument,
    prevDocument: keyBindings.prevDocument,
    selectAll: keyBindings.selectAll,
    deleteDocument: keyBindings.deleteDocument,
    addRemoveTags: keyBindings.addRemoveTags,
    renameFile: keyBindings.renameFile,
    openEntry: keyBindings.openEntry,
    openFileExternally: keyBindings.openFileExternally
  };

  const onContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setMouseX(event.clientX);
    setMouseY(event.clientY);
    if (selectedEntries.length > 0) {
      handleSetSelectedEntries([]);
    }
    setDirContextMenuAnchorEl(event.currentTarget);
  };

  const onClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (selectedEntries.length > 0) {
      handleSetSelectedEntries([]);
    }
  };

  const keyBindingHandlers = {
    nextDocument: () => dispatch(AppActions.openNextFile()),
    prevDocument: () => dispatch(AppActions.openPrevFile()),
    selectAll: () => toggleSelectAllFiles(),
    deleteDocument: () => {
      if (fileOperationsEnabled(selectedEntries)) {
        openDeleteFileDialog();
      }
    },
    addRemoveTags: () => {
      if (lastSelectedEntryPath) {
        openAddRemoveTagsDialog();
      }
    },
    renameFile: () => {
      openRenameEntryDialog();
    },
    openEntry: e => {
      e.preventDefault();
      openFsEntry();
    },
    openFileExternally: () => {
      handleOpenFileNatively();
    }
  };

  const sortedDirectories = sortedDirContent.current.filter(
    entry => !entry.isFile
  );
  const sortedFiles = sortedDirContent.current.filter(entry => entry.isFile);
  const locationPath = currentLocation
    ? PlatformIO.getLocationPath(currentLocation)
    : '';
  let entryWidth = 200;
  if (entrySize.current === 'small') {
    entryWidth = 150;
  } else if (entrySize.current === 'normal') {
    entryWidth = 200;
  } else if (entrySize.current === 'big') {
    entryWidth = 300;
  }

  const getCellContent = (
    fsEntry: TS.FileSystemEntry,
    selectedEntries: Array<TS.FileSystemEntry>,
    index: number,
    handleGridContextMenu: (
      event: React.MouseEvent<HTMLDivElement>,
      fsEntry: TS.FileSystemEntry
    ) => void,
    handleGridCellClick,
    handleGridCellDblClick,
    isLast?: boolean
  ) => {
    let selected = false;
    if (
      selectedEntries &&
      selectedEntries.some(entry => entry.path === fsEntry.path)
    ) {
      selected = true;
    }
    const selectEntry = (fsEntry: TS.FileSystemEntry) => {
      handleSetSelectedEntries([...selectedEntries, fsEntry]);
    };

    const deselectEntry = (fsEntry: TS.FileSystemEntry) => {
      const newSelection = selectedEntries.filter(
        data => data.path !== fsEntry.path
      );
      handleSetSelectedEntries(newSelection);
    };
    return (
      <TagDropContainer
        entryPath={fsEntry.path} // TODO remove entryPath it is already included in selectedEntries
        selectedEntries={
          selectedEntries.length > 0 ? selectedEntries : [fsEntry]
        }
      >
        <CellContent
          selected={selected}
          fsEntry={fsEntry}
          showEntriesDescription={showEntriesDescription.current}
          entrySize={entrySize.current}
          isLast={isLast}
          thumbnailMode={thumbnailMode.current}
          selectedEntries={selectedEntries}
          selectEntry={selectEntry}
          deselectEntry={deselectEntry}
          handleTagMenu={handleTagMenu}
          layoutType={layoutType.current}
          showTags={showTags.current}
          openFsEntry={openFsEntry}
          handleGridContextMenu={(
            event: React.MouseEvent<HTMLDivElement>,
            fsEntry: TS.FileSystemEntry
          ) => {
            setMouseX(event.clientX);
            setMouseY(event.clientY);
            handleGridContextMenu(event, fsEntry);
          }}
          handleGridCellDblClick={handleGridCellDblClick}
          handleGridCellClick={handleGridCellClick}
        />
      </TagDropContainer>
    );
  };

  return (
    <div
      style={{
        height: 'calc(100% - 48px)'
      }}
      data-tid={defaultSettings.testID}
    >
      <MainToolbar
        prefixDataTID={'grid'}
        layoutType={layoutType.current}
        selectedEntries={selectedEntries}
        loadParentDirectoryContent={loadParentDirectoryContent}
        toggleSelectAllFiles={toggleSelectAllFiles}
        someFileSelected={someFileSelected}
        handleLayoutSwitch={handleLayoutSwitch}
        openAddRemoveTagsDialog={openAddRemoveTagsDialog}
        fileOperationsEnabled={fileOperationsEnabled(selectedEntries)}
        openMoveCopyFilesDialog={openMoveCopyFilesDialog}
        openDeleteFileDialog={openDeleteFileDialog}
        openFsEntry={openFsEntry}
        handleSortingMenu={handleSortingMenu}
        handleExportCsvMenu={handleExportCsvMenu}
        openSettings={openSettings}
        directoryPath={currentDirectoryPath}
        openShareFilesDialog={
          PlatformIO.haveObjectStoreSupport() ? openShareFilesDialog : undefined
        }
      />
      <GlobalHotKeys
        keyMap={keyMap}
        handlers={keyBindingHandlers}
        allowChanges={true}
      >
        <GridPagination
          gridPageLimit={gridPageLimit.current}
          style={{
            margin: 0,
            display: 'grid',
            gridGap: '5px 5px',
            padding: 5,
            paddingBottom: 10,
            gridTemplateColumns:
              'repeat(auto-fit,minmax(' + entryWidth + 'px,1fr))'
          }}
          directories={sortedDirectories}
          showDetails={showDetails.current}
          showDescription={showDescription.current}
          showDirectories={showDirectories.current}
          isReadOnlyMode={readOnlyMode}
          layoutType={layoutType.current}
          desktopMode={desktopMode}
          openRenameEntryDialog={openRenameEntryDialog}
          showTags={showTags.current}
          thumbnailMode={thumbnailMode.current}
          entrySize={entrySize.current}
          files={sortedFiles}
          getCellContent={getCellContent}
          currentPage={1}
          currentLocationPath={locationPath}
          currentDirectoryPath={currentDirectoryPath}
          onClick={onClick}
          onContextMenu={onContextMenu}
          settings={settings}
          selectedEntries={selectedEntries}
          setSelectedEntries={handleSetSelectedEntries}
          singleClickAction={singleClickAction.current}
          currentLocation={currentLocation}
          directoryContent={
            lastSearchTimestamp
              ? GlobalSearch.getInstance().getResults()
              : directoryContent
          }
          openFsEntry={openFsEntry}
          openFileNatively={handleOpenFileNatively}
          loadDirectoryContent={loadDirectoryContent}
          setFileContextMenuAnchorEl={setFileContextMenuAnchorEl}
          setDirContextMenuAnchorEl={setDirContextMenuAnchorEl}
          showNotification={handleShowNotification}
          moveFiles={handleMoveFiles}
          clearSelection={clearSelection}
        />
      </GlobalHotKeys>
      {isAddRemoveTagsDialogOpened && (
        <AddRemoveTagsDialog
          open={isAddRemoveTagsDialogOpened}
          onClose={() => setIsAddRemoveTagsDialogOpened(false)}
          removeTags={removeTags}
          removeAllTags={removeAllTags}
          selectedEntries={selectedEntries}
        />
      )}
      {isAddTagDialogOpened !== undefined && (
        <AddTagToTagGroupDialog
          open={true}
          onClose={() => setIsAddTagDialogOpened(undefined)}
          selectedTag={isAddTagDialogOpened}
        />
      )}
      {isGridSettingsDialogOpened && (
        <GridSettingsDialog
          open={isGridSettingsDialogOpened}
          onClose={isDefault => {
            setIsGridSettingsDialogOpened(false);
            isDefaultSetting.current = isDefault;
          }}
          setGridPageLimit={handleGridPageLimit}
          gridPageLimit={gridPageLimit.current}
          toggleShowDirectories={toggleShowDirectories}
          toggleShowTags={toggleShowTags}
          toggleShowDetails={toggleShowDetails}
          toggleShowDescription={toggleShowDescription}
          toggleShowEntriesDescription={toggleShowEntriesDescription}
          showDetails={showDetails.current}
          showDescription={showDescription.current}
          showEntriesDescription={showEntriesDescription.current}
          showDirectories={showDirectories.current}
          showTags={showTags.current}
          toggleThumbnailsMode={toggleThumbnailsMode}
          thumbnailMode={thumbnailMode.current}
          changeEntrySize={changeEntrySize}
          entrySize={entrySize.current}
          changeSingleClickAction={changeSingleClickAction}
          singleClickAction={singleClickAction.current}
          openHelpWebPage={openHelpWebPage}
          sortBy={sortBy.current}
          orderBy={orderBy.current}
          handleSortingMenu={handleSortingMenu}
          isLocal={isLocal}
          resetLocalSettings={() => {
            Pro.MetaOperations.savePerspectiveSettings(
              currentDirectoryPath,
              PerspectiveIDs.GRID
            ).then((fsEntryMeta: TS.FileSystemEntryMeta) => {
              dispatch(AppActions.setDirectoryMeta(fsEntryMeta));
              setIsGridSettingsDialogOpened(false);
            });
          }}
        />
      )}
      {isMoveCopyFilesDialogOpened && (
        <MoveCopyFilesDialog
          open={isMoveCopyFilesDialogOpened}
          onClose={() => setIsMoveCopyFilesDialogOpened(false)}
        />
      )}
      {isShareFilesDialogOpened && Pro && (
        <ShareFilesDialog
          open={isShareFilesDialogOpened}
          onClose={() => setIsShareFilesDialogOpened(false)}
        />
      )}
      {Boolean(fileContextMenuAnchorEl) && (
        <FileMenu
          anchorEl={fileContextMenuAnchorEl}
          mouseX={mouseX}
          mouseY={mouseY}
          open={Boolean(fileContextMenuAnchorEl)}
          onClose={() => setFileContextMenuAnchorEl(null)}
          openDeleteFileDialog={openDeleteFileDialog}
          openRenameFileDialog={openRenameEntryDialog}
          openMoveCopyFilesDialog={openMoveCopyFilesDialog}
          openShareFilesDialog={
            PlatformIO.haveObjectStoreSupport()
              ? openShareFilesDialog
              : undefined
          }
          openAddRemoveTagsDialog={openAddRemoveTagsDialog}
          openFileNatively={handleOpenFileNatively}
          loadDirectoryContent={loadDirectoryContent}
          showInFileManager={showInFileManager}
          selectedFilePath={lastSelectedEntryPath}
          selectedEntries={selectedEntries}
          currentLocation={currentLocation}
        />
      )}
      {/* {Boolean(dirContextMenuAnchorEl) && ( // todo move dialogs from DirectoryMenu */}
      <DirectoryMenu
        open={Boolean(dirContextMenuAnchorEl)}
        onClose={() => setDirContextMenuAnchorEl(null)}
        anchorEl={dirContextMenuAnchorEl}
        mouseX={mouseX}
        mouseY={mouseY}
        directoryPath={lastSelectedEntryPath}
        loadDirectoryContent={loadDirectoryContent}
        openRenameDirectoryDialog={openRenameEntryDialog}
        openMoveCopyFilesDialog={openMoveCopyFilesDialog}
        openDirectory={openDirectory}
        openFsEntry={openFsEntry}
        perspectiveMode={lastSelectedEntryPath !== currentDirectoryPath}
        currentLocation={currentLocation}
        openAddRemoveTagsDialog={openAddRemoveTagsDialog}
      />
      {/* {Boolean(tagContextMenuAnchorEl) && ( // TODO EntryTagMenu is used in TagSelect we cannot move confirm dialog from menu */}
      <EntryTagMenu
        anchorEl={tagContextMenuAnchorEl}
        open={Boolean(tagContextMenuAnchorEl)}
        onClose={() => setTagContextMenuAnchorEl(null)}
        setIsAddTagDialogOpened={setIsAddTagDialogOpened}
        selectedTag={selectedTag.current}
        currentEntryPath={selectedEntryPath.current} // getSelEntryPath()}
        removeTags={removeTags}
      />
      {Boolean(sortingContextMenuAnchorEl) && (
        <SortingMenu
          open={Boolean(sortingContextMenuAnchorEl)}
          onClose={() => setSortingContextMenuAnchorEl(null)}
          anchorEl={sortingContextMenuAnchorEl}
          sortBy={sortBy.current}
          orderBy={orderBy.current}
          handleSortBy={handleSortBy}
          searchModeEnabled={lastSearchTimestamp !== undefined}
        />
      )}
      {Boolean(optionsContextMenuAnchorEl) && (
        <GridOptionsMenu
          open={Boolean(optionsContextMenuAnchorEl)}
          onClose={closeOptionsMenu}
          anchorEl={optionsContextMenuAnchorEl}
          toggleShowDirectories={toggleShowDirectories}
          showDirectories={showDirectories.current}
          toggleShowTags={toggleShowTags}
          showTags={showTags.current}
          toggleThumbnailsMode={toggleThumbnailsMode}
          thumbnailMode={thumbnailMode.current}
          entrySize={entrySize.current}
          changeSingleClickAction={changeSingleClickAction}
          singleClickAction={singleClickAction.current}
          changeEntrySize={changeEntrySize}
          openHelpWebPage={openHelpWebPage}
          openSettings={openSettings}
        />
      )}
    </div>
  );
}

export default GridPerspective;
