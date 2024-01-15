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

import React, { useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTheme, styled } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Tooltip from '-/components/Tooltip';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import IconButton from '@mui/material/IconButton';
import {
  SelectedIcon,
  UnSelectedIcon,
  MoreMenuIcon,
} from '-/components/CommonIcons';
import {
  formatFileSize,
  formatDateTime,
} from '@tagspaces/tagspaces-common/misc';
import {
  extractTagsAsObjects,
  extractTitle,
} from '@tagspaces/tagspaces-common/paths';
import AppConfig from '-/AppConfig';
import {
  findBackgroundColorForFolder,
  findColorForEntry,
  getDescriptionPreview,
} from '-/services/utils-io';
import TagContainerDnd from '-/components/TagContainerDnd';
import TagContainer from '-/components/TagContainer';
import TagsPreview from '-/components/TagsPreview';
import PlatformIO from '-/services/platform-facade';
import EntryIcon from '-/components/EntryIcon';
import { TS } from '-/tagspaces.namespace';
import {
  actions as AppActions,
  AppDispatch,
  getLastThumbnailImageChange,
} from '-/reducers/app';
import { dataTidFormat } from '-/services/test';
import {
  getSupportedFileTypes,
  isDesktopMode,
  isReorderTags,
} from '-/reducers/settings';
import { defaultSettings } from '../index';
import { useTaggingActionsContext } from '-/hooks/useTaggingActionsContext';
import { useCurrentLocationContext } from '-/hooks/useCurrentLocationContext';
import { useSelectedEntriesContext } from '-/hooks/useSelectedEntriesContext';
import { EntrySizes } from '-/components/ZoomComponent';

export function urlGetDelim(url) {
  return url.indexOf('?') > 0 ? '&' : '?';
}

export function calculateEntryWitdth(entrySize: EntrySizes) {
  let entryWidth = 200;
  if (entrySize === EntrySizes.tiny) {
    entryWidth = 100;
  } else if (entrySize === EntrySizes.small) {
    entryWidth = 150;
  } else if (entrySize === EntrySizes.normal) {
    entryWidth = 200;
  } else if (entrySize === EntrySizes.big) {
    entryWidth = 250;
  } else if (entrySize === EntrySizes.huge) {
    entryWidth = 300;
  }
  return entryWidth;
}

export function calculateEntryHeight(entrySize: EntrySizes) {
  let entryHeight = 200;
  if (entrySize === EntrySizes.tiny) {
    entryHeight = 100;
  } else if (entrySize === EntrySizes.small) {
    entryHeight = 150;
  } else if (entrySize === EntrySizes.normal) {
    entryHeight = 200;
  } else if (entrySize === EntrySizes.big) {
    entryHeight = 250;
  } else if (entrySize === EntrySizes.huge) {
    entryHeight = 300;
  }
  return entryHeight;
}

const PREFIX = 'GridStyles';
export const classes = {
  gridCell: `${PREFIX}-gridCell`,
  selectedGridCell: `${PREFIX}-selectedGridCell`,
  gridCellTitle: `${PREFIX}-gridCellTitle`,
  // gridCellTags: `${PREFIX}-gridCellTags`,
  gridCellDescription: `${PREFIX}-gridCellDescription`,
  gridFileExtension: `${PREFIX}-gridFileExtension`,
  gridSizeDate: `${PREFIX}-gridSizeDate`,
  gridDetails: `${PREFIX}-gridDetails`,
  gridFolder: `${PREFIX}-gridFolder`,
};

export const GridPaper = styled(Card)(({ theme }) => ({
  [`& .${classes.gridCell}`]: {
    border: '2px solid transparent',
    marginTop: 1,
    marginLeft: 2,
    marginBottom: 1,
    marginRight: 1,
  },
  [`& .${classes.selectedGridCell}`]: {
    border: '2px solid' + theme.palette.primary.main,
    backgroundColor: theme.palette.primary.light + ' !important',
  },
  [`& .${classes.gridCellTitle}`]: {
    padding: '0px 5px 0 5px',
    minHeight: 45,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
  },
  // [`& .${classes.gridCellTags}`]: {
  //   padding: 0,
  //   paddingTop: 2,
  //   height: 100,
  //   overflowY: 'auto',
  //   overflowX: 'hidden',
  //   position: 'relative',
  // },
  [`& .${classes.gridCellDescription}`]: {
    padding: 2,
    margin: 2,
    backgroundColor: theme.palette.background.paper,
    borderRadius: 5,
    opacity: 0.6,
    wordBreak: 'break-word',
    display: 'block',
  },
  [`& .${classes.gridFileExtension}`]: {
    paddingTop: 1,
    paddingBottom: 7,
    paddingLeft: 3,
    paddingRight: 3,
    fontSize: 13,
    marginRight: 5,
    minWidth: 35,
    height: 16,
    color: 'white',
    borderRadius: 3,
    textAlign: 'center',
  },
}));

interface Props {
  selected: boolean;
  isLast?: boolean;
  fsEntry: TS.FileSystemEntry;
  entrySize: EntrySizes;
  style?: any;
  thumbnailMode: any;
  selectEntry: (fsEntry: TS.FileSystemEntry) => void;
  deselectEntry: (fsEntry: TS.FileSystemEntry) => void;
  selectionMode: boolean;
  showTags: boolean;
  handleTagMenu: (event: Object, tag: TS.Tag, entryPath: string) => void;
  handleGridContextMenu: (event: Object, fsEntry: TS.FileSystemEntry) => void;
  handleGridCellDblClick: (event: Object, fsEntry: TS.FileSystemEntry) => void;
  handleGridCellClick: (event: Object, fsEntry: TS.FileSystemEntry) => void;
  showEntriesDescription?: boolean;
}

function GridCell(props: Props) {
  const {
    selected,
    fsEntry,
    entrySize,
    thumbnailMode,
    handleTagMenu,
    handleGridContextMenu,
    handleGridCellDblClick,
    handleGridCellClick,
    showEntriesDescription,
    showTags,
    selectEntry,
    deselectEntry,
    selectionMode,
    isLast,
  } = props;

  const { t } = useTranslation();
  const theme = useTheme();
  const { selectedEntries } = useSelectedEntriesContext();
  const { addTags, editTagForEntry } = useTaggingActionsContext();
  const { readOnlyMode } = useCurrentLocationContext();
  const supportedFileTypes = useSelector(getSupportedFileTypes);
  const reorderTags: boolean = useSelector(isReorderTags);
  const lastThumbnailImageChange = useSelector(getLastThumbnailImageChange);
  const desktopMode = useSelector(isDesktopMode);
  const dispatch: AppDispatch = useDispatch();

  const handleEditTag = (path: string, tag: TS.Tag, newTagTitle?: string) => {
    editTagForEntry(path, tag, newTagTitle);
  };
  const handleAddTags = (
    paths: Array<string>,
    tags: Array<TS.Tag>,
    updateIndex?,
  ) => {
    addTags(paths, tags, updateIndex);
  };

  const handleAddTag = (tag: TS.Tag, parentTagGroupUuid: TS.Uuid) => {
    dispatch(AppActions.addTag(tag, parentTagGroupUuid));
  };

  // remove isNewFile on Cell click it will open file in editMode
  const fSystemEntry: TS.FileSystemEntry = (({ isNewFile, ...o }) => o)(
    fsEntry,
  );

  const entryTitle = extractTitle(
    fSystemEntry.name,
    !fSystemEntry.isFile,
    PlatformIO.getDirSeparator(),
  );

  let description;
  if (showEntriesDescription) {
    description = fSystemEntry.description;
    if (
      description &&
      description.length > defaultSettings.maxDescriptionPreviewLength
    ) {
      description = getDescriptionPreview(
        description,
        defaultSettings.maxDescriptionPreviewLength,
      );
    }
  }

  const fileSystemEntryColor = findColorForEntry(
    fSystemEntry,
    supportedFileTypes,
  );
  const fileSystemEntryBgColor = findBackgroundColorForFolder(fSystemEntry);

  let fileNameTags = [];
  if (fSystemEntry.isFile) {
    fileNameTags = extractTagsAsObjects(
      fSystemEntry.name,
      AppConfig.tagDelimiter,
      PlatformIO.getDirSeparator(),
    );
  }

  const fileSystemEntryTags = fSystemEntry.tags ? fSystemEntry.tags : [];
  const sideCarTagsTitles = fileSystemEntryTags.map((tag) => tag.title);
  const entryTags = [
    ...fileSystemEntryTags,
    ...fileNameTags.filter((tag) => !sideCarTagsTitles.includes(tag.title)),
  ];

  const entryPath = fSystemEntry.path;
  const isSmall = entrySize === EntrySizes.tiny; // || entrySize === EntrySizes.small;

  const renderTags = useMemo(() => {
    let sideCarLength = 0;
    return entryTags.map((tag: TS.Tag, index) => {
      const tagContainer = readOnlyMode ? (
        <TagContainer
          tag={tag}
          key={entryPath + tag.title}
          entryPath={entryPath}
          addTags={handleAddTags}
          handleTagMenu={handleTagMenu}
        />
      ) : (
        <TagContainerDnd
          tag={tag}
          index={tag.type === 'sidecar' ? index : index - sideCarLength}
          key={entryPath + tag.title}
          entryPath={entryPath}
          addTags={handleAddTags}
          addTag={handleAddTag}
          handleTagMenu={handleTagMenu}
          selectedEntries={selectedEntries}
          editTagForEntry={handleEditTag}
          reorderTags={reorderTags}
        />
      );

      if (tag.type === 'sidecar') {
        sideCarLength = index + 1;
      }
      return tagContainer;
    });
  }, [entryTags, readOnlyMode, reorderTags, entryPath]);

  const maxHeight = calculateEntryHeight(entrySize);

  function generateCardHeader() {
    return (
      !isSmall &&
      fSystemEntry.isFile &&
      fSystemEntry.lmdt && (
        <>
          <Tooltip
            title={
              t('core:modifiedDate') +
              ': ' +
              formatDateTime(fSystemEntry.lmdt, true)
            }
          >
            {formatDateTime(fSystemEntry.lmdt, false)}
          </Tooltip>
          <Tooltip title={fSystemEntry.size + ' ' + t('core:sizeInBytes')}>
            <span>{' | ' + formatFileSize(fSystemEntry.size)}</span>
          </Tooltip>
        </>
      )
    );
  }

  function generateAvatar() {
    return selectionMode ? (
      <IconButton
        style={{
          opacity: selected ? 1 : 0.5,
          padding: desktopMode ? 5 : 8,
        }}
        size="small"
        onMouseLeave={(e) => {
          //@ts-ignore
          e.target.style.opacity = selected ? 1 : 0.5;
        }}
        onMouseOver={(e) => {
          //@ts-ignore
          e.target.style.opacity = 1;
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (selected) {
            deselectEntry(fSystemEntry);
          } else {
            selectEntry(fSystemEntry);
          }
        }}
      >
        {selected ? (
          <SelectedIcon
            style={{
              opacity: 1,
              borderRadius: 15,
              backgroundColor: '#d7d7d7',
            }}
          />
        ) : (
          <UnSelectedIcon
            style={{
              opacity: 0.7,
              borderRadius: 15,
              backgroundColor: 'd7d7d7',
            }}
          />
        )}
      </IconButton>
    ) : (
      <Tooltip title={fSystemEntry.path}>
        <Typography
          className={classes.gridFileExtension}
          style={{
            display: 'inline',
            backgroundColor: fileSystemEntryColor,
            textShadow: '1px 1px #8f8f8f',
            textOverflow: 'unset',
            maxWidth: fSystemEntry.isFile ? 50 : 100,
          }}
          noWrap={true}
          variant="button"
          onClick={(e) => {
            e.stopPropagation();
            selectEntry(fSystemEntry);
          }}
        >
          {fSystemEntry.isFile ? fSystemEntry.extension : <FolderOpenIcon />}
        </Typography>
      </Tooltip>
    );
  }

  return (
    <GridPaper
      data-entry-id={fSystemEntry.uuid}
      data-tid={'fsEntryName_' + dataTidFormat(fSystemEntry.name)}
      // className={classNames(
      //   classes.gridCell,
      //   selected && classes.selectedGridCell,
      // )}
      style={{
        height: maxHeight,
        minHeight: maxHeight,
        maxHeight: maxHeight,
        marginBottom: isLast ? 40 : 'auto',
        background: fileSystemEntryBgColor && theme.palette.background.default,
      }}
      onContextMenu={(event) => handleGridContextMenu(event, fSystemEntry)}
      onDoubleClick={(event) => {
        handleGridCellDblClick(event, fSystemEntry);
      }}
      onClick={(event) => {
        event.stopPropagation();
        AppConfig.isCordovaiOS // TODO DoubleClick not fired in Cordova IOS
          ? handleGridCellDblClick(event, fSystemEntry)
          : handleGridCellClick(event, fSystemEntry);
      }}
      onDrag={(event) => {
        handleGridCellClick(event, fSystemEntry);
      }}
    >
      <CardHeader
        style={{ padding: 5 }}
        sx={{
          '.MuiCardHeader-avatar': {
            margin: 0,
            alignSelf: 'flex-start',
          },
          '.MuiCardHeader-subheader': {
            fontSize: 12,
          },
          // '.MuiCardHeader-header': {
          //   fontSize: 12,
          // },
        }}
        title={entryTitle}
        subheader={generateCardHeader()}
        action={
          <IconButton
            aria-label="entry context menu"
            size="small"
            onClick={(event) => handleGridContextMenu(event, fSystemEntry)}
          >
            <MoreMenuIcon />
          </IconButton>
        }
        avatar={generateAvatar()}
      ></CardHeader>

      <CardContent sx={{ width: 'auto', padding: 0, height: maxHeight - 30 }}>
        {fSystemEntry.thumbPath ? (
          <img
            alt="thumbnail"
            style={{
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              objectFit: thumbnailMode,
              width: '100%',
              height: '100%',
            }}
            src={
              fSystemEntry.thumbPath +
              (lastThumbnailImageChange &&
              lastThumbnailImageChange.thumbPath === fSystemEntry.thumbPath &&
              !PlatformIO.haveObjectStoreSupport() &&
              !PlatformIO.haveWebDavSupport()
                ? urlGetDelim(fSystemEntry.thumbPath) +
                  lastThumbnailImageChange.dt
                : '')
            }
            // @ts-ignore
            onError={(i) => (i.target.style.display = 'none')}
            loading="lazy"
          />
        ) : (
          <Box style={{ width: '50%', margin: '0 auto' }}>
            <EntryIcon
              isFile={fSystemEntry.isFile}
              fileExtension={fSystemEntry.extension}
            />
          </Box>
        )}
        {showTags && entryTags && !isSmall ? (
          renderTags
        ) : (
          <TagsPreview tags={entryTags} />
        )}
      </CardContent>
    </GridPaper>
  );
}

export default GridCell;
