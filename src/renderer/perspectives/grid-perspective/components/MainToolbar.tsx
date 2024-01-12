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

import React from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import { useDispatch, useSelector } from 'react-redux';
import { Toolbar, Box, Divider } from '@mui/material/';
import Tooltip from '-/components/Tooltip';
import IconButton from '@mui/material/IconButton';
import SortingIcon from '@mui/icons-material/SwapVerticalCircle';
import TagIcon from '@mui/icons-material/LocalOffer';
import ShareIcon from '@mui/icons-material/Share';
import { SelectedIcon, UnSelectedIcon } from '-/components/CommonIcons';
import CopyIcon from '@mui/icons-material/FileCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import ExportIcon from '@mui/icons-material/AssignmentReturn';
import {
  ParentFolderIcon,
  FolderPropertiesIcon,
  PerspectiveSettingsIcon,
} from '-/components/CommonIcons';
import AppConfig from '-/AppConfig';
import { Pro } from '-/pro';
import { ProTooltip } from '-/components/HelperComponents';
import ZoomSlider, { EntrySizes } from '-/components/ZoomComponent';
import { getKeyBindingObject } from '-/reducers/settings';
import { actions as AppActions, AppDispatch } from '-/reducers/app';
import { useTranslation } from 'react-i18next';
import { useOpenedEntryContext } from '-/hooks/useOpenedEntryContext';
import { useDirectoryContentContext } from '-/hooks/useDirectoryContentContext';
import { useCurrentLocationContext } from '-/hooks/useCurrentLocationContext';
import { useSelectedEntriesContext } from '-/hooks/useSelectedEntriesContext';

interface Props {
  prefixDataTID?: string;
  toggleSelectAllFiles: (event: any) => void;
  openAddRemoveTagsDialog: () => void;
  openMoveCopyFilesDialog: () => void;
  handleSortingMenu: (event: Object) => void;
  changeEntrySize: (entrySize: EntrySizes) => void;
  entrySize: EntrySizes;
  handleExportCsvMenu: () => void;
  openSettings: () => void;
  openShareFilesDialog?: () => void;
}

function MainToolbar(props: Props) {
  const {
    prefixDataTID,
    toggleSelectAllFiles,
    openAddRemoveTagsDialog,
    openMoveCopyFilesDialog,
    handleSortingMenu,
    handleExportCsvMenu,
    openSettings,
    openShareFilesDialog,
    entrySize,
    changeEntrySize,
  } = props;

  const { t } = useTranslation();
  const theme = useTheme();
  const { openEntry } = useOpenedEntryContext();
  const { loadParentDirectoryContent, currentDirectoryPath } =
    useDirectoryContentContext();
  const { selectedEntries } = useSelectedEntriesContext();
  const keyBindings = useSelector(getKeyBindingObject);
  const dispatch: AppDispatch = useDispatch();
  const { readOnlyMode } = useCurrentLocationContext();

  function showProperties() {
    return openEntry(currentDirectoryPath, true);
  }

  return (
    <Toolbar
      style={{
        paddingLeft: 5,
        paddingRight: 5,
        position: 'absolute',
        zIndex: 1,
        background:
          'linear-gradient(0deg, ' +
          alpha(theme.palette.background.default, 0.67) +
          ' 0%, ' +
          theme.palette.background.default +
          ' 99%)',
        backdropFilter: 'blur(5px)',
        // borderBottom: '1px solid ' + theme.palette.divider,
        width: 'calc(100% - 10px)',
        overflowX: 'auto',
        overflowY: 'hidden',
      }}
      variant="dense"
      data-tid={prefixDataTID + 'perspectiveToolbar'}
    >
      <Tooltip
        title={t('core:navigateToParentDirectory')}
        keyBinding={keyBindings['openParentDirectory']}
      >
        <IconButton
          aria-label={t('core:navigateToParentDirectory')}
          data-tid={prefixDataTID + 'PerspectiveOnBackButton'}
          onClick={() => {
            loadParentDirectoryContent();
          }}
          // size="large"
        >
          <ParentFolderIcon />
        </IconButton>
      </Tooltip>
      <Tooltip
        title={t('core:toggleSelectAllFiles')}
        keyBinding={keyBindings['selectAll']}
      >
        <IconButton
          data-tid={prefixDataTID + 'PerspectiveSelectAllFiles'}
          onClick={toggleSelectAllFiles}
          // size="large"
        >
          {selectedEntries.length > 1 ? <SelectedIcon /> : <UnSelectedIcon />}
        </IconButton>
      </Tooltip>
      <Tooltip title={t('core:directoryPropertiesTitle')}>
        <IconButton
          aria-label={t('core:directoryPropertiesTitle')}
          data-tid="openFolderProperties"
          onClick={showProperties}
          // size="large"
        >
          <FolderPropertiesIcon />
        </IconButton>
      </Tooltip>
      <Divider flexItem orientation="vertical" sx={{ mx: 0.5, my: 1 }} />
      <Box sx={{ display: selectedEntries.length < 1 ? 'none' : 'flex' }}>
        {!readOnlyMode && (
          <Tooltip
            title={t('core:tagSelectedEntries')}
            keyBinding={keyBindings['addRemoveTags']}
          >
            <span>
              <IconButton
                aria-label={t('core:tagSelectedEntries')}
                data-tid={prefixDataTID + 'PerspectiveAddRemoveTags'}
                onClick={openAddRemoveTagsDialog}
                // size="large"
              >
                <TagIcon />
              </IconButton>
            </span>
          </Tooltip>
        )}
        {!readOnlyMode && (
          <Tooltip
            title={t('core:copyMoveSelectedEntries')}
            keyBinding={keyBindings['copyMoveSelectedEntries']}
          >
            <span>
              <IconButton
                aria-label={t('core:copyMoveSelectedEntries')}
                data-tid={prefixDataTID + 'PerspectiveCopySelectedFiles'}
                onClick={openMoveCopyFilesDialog}
                // size="large"
              >
                <CopyIcon />
              </IconButton>
            </span>
          </Tooltip>
        )}
        {!readOnlyMode && (
          <Tooltip
            title={t('core:deleteSelectedEntries')}
            keyBinding={keyBindings['deleteDocument']}
          >
            <span>
              <IconButton
                aria-label={t('core:deleteSelectedEntries')}
                data-tid={prefixDataTID + 'PerspectiveDeleteMultipleFiles'}
                onClick={() =>
                  dispatch(AppActions.toggleDeleteMultipleEntriesDialog())
                }
                // </span>size="large"
              >
                <DeleteIcon />
              </IconButton>
            </span>
          </Tooltip>
        )}
        {openShareFilesDialog && (
          <ProTooltip tooltip={t('core:shareFiles')}>
            <span>
              <IconButton
                aria-label={t('core:shareFiles')}
                data-tid={prefixDataTID + 'PerspectiveShareFiles'}
                onClick={openShareFilesDialog}
                disabled={selectedEntries.length < 1}
                // size="large"
              >
                <ShareIcon />
              </IconButton>
            </span>
          </ProTooltip>
        )}
        <Divider flexItem orientation="vertical" sx={{ mx: 0.5, my: 1 }} />
      </Box>
      <Tooltip title={t('core:sort')}>
        <IconButton
          aria-label={t('core:sort')}
          data-tid={prefixDataTID + 'PerspectiveSortMenu'}
          onClick={(e) => {
            handleSortingMenu(e);
          }}
          // size="large"
        >
          <SortingIcon />
        </IconButton>
      </Tooltip>
      {Pro &&
        !AppConfig.isCordovaAndroid && ( // SaveAs do not worlk on Android
          <Tooltip title={t('core:exportCsv')}>
            <IconButton
              data-tid={prefixDataTID + 'PerspectiveExportCsvMenuTID'}
              onClick={handleExportCsvMenu}
              style={{ transform: 'scale(-1, 1)' }}
              // size="large"
            >
              <ExportIcon />
            </IconButton>
          </Tooltip>
        )}
      <Divider flexItem orientation="vertical" sx={{ mx: 0.5, my: 1 }} />
      <Box sx={{ display: { xs: 'none', sm: 'flex' } }}>
        <ZoomSlider entrySize={entrySize} changeEntrySize={changeEntrySize} />
        <Divider flexItem orientation="vertical" sx={{ mx: 0.5, my: 1 }} />
      </Box>
      <Box sx={{ flexGrow: 1 }} />
      <Box sx={{ display: 'flex' }}>
        <Tooltip title={t('core:perspectiveSettingsTitle')}>
          <IconButton
            data-tid={prefixDataTID + 'PerspectiveOptionsMenu'}
            onClick={openSettings}
            // size="large"
          >
            <PerspectiveSettingsIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Toolbar>
  );
}

export default MainToolbar;
