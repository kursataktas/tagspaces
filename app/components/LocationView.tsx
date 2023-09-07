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

import React, { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Tooltip from '-/components/Tooltip';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { LocalLocationIcon, CloudLocationIcon } from '-/components/CommonIcons';
import DefaultLocationIcon from '@mui/icons-material/Highlight';
import { locationType } from '@tagspaces/tagspaces-common/misc';
import AppConfig from '-/AppConfig';
import {
  actions as AppActions,
  AppDispatch,
  getCurrentLocationId,
  isReadOnlyMode
} from '../reducers/app';
import PlatformIO from '../services/platform-facade';
import TargetMoveFileBox from './TargetMoveFileBox';
import DragItemTypes from './DragItemTypes';
import IOActions from '../reducers/io-actions';
import DirectoryTreeView, {
  DirectoryTreeViewRef
} from '-/components/DirectoryTreeView';
import { getCurrentLanguage } from '-/reducers/settings';
import LocationContextMenu from '-/components/menus/LocationContextMenu';
import { TS } from '-/tagspaces.namespace';
import { classes, SidePanel } from '-/components/SidePanels.css';
import { useTranslation } from 'react-i18next';

interface Props {
  location: TS.Location;
  hideDrawer?: () => void;
  setEditLocationDialogOpened: (open: boolean) => void;
  setDeleteLocationDialogOpened: (open: boolean) => void;
  selectedLocation: TS.Location;
  setSelectedLocation: (loc: TS.Location) => void;
}

function LocationView(props: Props) {
  const { t } = useTranslation();
  const directoryTreeRef = useRef<DirectoryTreeViewRef>(null);
  const [
    locationDirectoryContextMenuAnchorEl,
    setLocationDirectoryContextMenuAnchorEl
  ] = useState<null | HTMLElement>(null);

  const dispatch: AppDispatch = useDispatch();
  const language = useSelector(getCurrentLanguage);
  const currentLocationId: string = useSelector(getCurrentLocationId);
  const readOnlyMode = useSelector(isReadOnlyMode);

  const {
    location,
    hideDrawer,
    setSelectedLocation,
    setEditLocationDialogOpened,
    setDeleteLocationDialogOpened,
    selectedLocation
  } = props;
  const isCloudLocation = location.type === locationType.TYPE_CLOUD;

  const handleLocationIconClick = (
    event: React.MouseEvent<HTMLSpanElement, MouseEvent>
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (directoryTreeRef.current) {
      directoryTreeRef.current.changeLocation(location);
    }
  };

  const handleLocationClick = () => {
    if (location.uuid === currentLocationId) {
      // the same location click

      dispatch(
        AppActions.loadDirectoryContent(
          PlatformIO.getLocationPath(location),
          true,
          true
        )
      );
    } else {
      // this.directoryTreeRef[location.uuid].loadSubDir(location, 1);
      dispatch(AppActions.setSelectedEntries([]));
      dispatch(AppActions.exitSearchMode());
      dispatch(AppActions.openLocation(location));
      if (hideDrawer) {
        hideDrawer();
      }
    }
  };

  const closeLocationTree = () => {
    directoryTreeRef.current.closeLocation();
  };

  const handleLocationContextMenuClick = (event: any) => {
    event.preventDefault();
    event.stopPropagation();
    setLocationDirectoryContextMenuAnchorEl(event.currentTarget);
    setSelectedLocation(location);
  };

  const onUploadProgress = (progress, response) => {
    dispatch(AppActions.onUploadProgress(progress, response));
  };

  /**
   * https://github.com/react-component/table/blob/master/examples/react-dnd.js
   * @param item
   * @param monitor
   */
  const handleFileMoveDrop = (item, monitor) => {
    if (monitor) {
      const { path, selectedEntries } = monitor.getItem();
      const arrPath = [];
      if (selectedEntries && selectedEntries.length > 0) {
        selectedEntries.map(entry => {
          arrPath.push(entry.path);
          return true;
        });
      } else {
        arrPath.push(path);
      }
      if (readOnlyMode) {
        dispatch(
          AppActions.showNotification(
            t('core:dndDisabledReadOnlyMode'),
            'error',
            true
          )
        );
        return;
      }
      if (!AppConfig.isWin && !path.startsWith('/')) {
        dispatch(
          AppActions.showNotification(
            t('Moving file not possible'),
            'error',
            true
          )
        );
        return;
      }
      if (AppConfig.isWin && !path.substr(1).startsWith(':')) {
        dispatch(
          AppActions.showNotification(
            t('Moving file not possible'),
            'error',
            true
          )
        );
        return;
      }
      let targetPath = item.path;
      const targetLocation = item.location;
      if (targetPath === undefined) {
        targetPath = targetLocation.path;
      }

      if (monitor && targetPath !== undefined && targetLocation !== undefined) {
        // TODO handle monitor -> isOver and change folder icon
        console.log('Dropped files: ' + path);
        if (targetLocation.type === locationType.TYPE_CLOUD) {
          // TODO Webdav
          PlatformIO.enableObjectStoreSupport(targetLocation)
            .then(() => {
              dispatch(AppActions.resetProgress());
              dispatch(AppActions.toggleUploadDialog());
              dispatch(
                IOActions.uploadFiles(arrPath, targetPath, onUploadProgress)
              )
                .then((fsEntries: Array<TS.FileSystemEntry>) => {
                  dispatch(AppActions.reflectCreateEntries(fsEntries));
                  return true;
                })
                .catch(error => {
                  console.log('uploadFiles', error);
                });
              return true;
            })
            .catch(error => {
              console.log('enableObjectStoreSupport', error);
            });
        } else if (targetLocation.type === locationType.TYPE_LOCAL) {
          PlatformIO.disableObjectStoreSupport();
          dispatch(IOActions.moveFiles(arrPath, targetPath));
        }
        dispatch(AppActions.setSelectedEntries([]));
      }
    }
  };

  let locationNameTitle = PlatformIO.getLocationPath(location);
  if (isCloudLocation && location.bucketName) {
    if (location.endpointURL) {
      locationNameTitle = location.endpointURL + ' - ' + location.bucketName;
    } else if (location.region) {
      locationNameTitle = location.region + ' - ' + location.bucketName;
    }
  }

  const LocationTitle = (
    <Tooltip title={locationNameTitle}>
      <div
        style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: 240
        }}
      >
        <Typography
          variant="inherit"
          style={{
            paddingLeft: 5,
            paddingRight: 5
          }}
          className={classes.header}
          data-tid="locationTitleElement"
          noWrap
        >
          {location.name}
        </Typography>
      </div>
    </Tooltip>
  );

  return (
    /* <div key={location.uuid}> */
    <SidePanel>
      {locationDirectoryContextMenuAnchorEl && (
        <LocationContextMenu
          setEditLocationDialogOpened={setEditLocationDialogOpened}
          setDeleteLocationDialogOpened={setDeleteLocationDialogOpened}
          selectedLocation={selectedLocation}
          locationDirectoryContextMenuAnchorEl={
            locationDirectoryContextMenuAnchorEl
          }
          setLocationDirectoryContextMenuAnchorEl={
            setLocationDirectoryContextMenuAnchorEl
          }
          closeLocationTree={closeLocationTree}
        />
      )}
      <ListItem
        data-tid={'location_' + location.name.replace(/ /g, '_')}
        className={
          currentLocationId === location.uuid
            ? classes.listItemSelected
            : classes.listItem
        }
        button
        onClick={handleLocationClick}
        onContextMenu={event => handleLocationContextMenuClick(event)}
      >
        <ListItemIcon
          // onClick={(e) => {
          //   e.preventDefault();
          //   this.loadSubDirectories(location, 1);
          // }}
          style={{
            minWidth: 'auto',
            cursor: 'pointer'
          }}
          onClick={handleLocationIconClick}
        >
          <Tooltip title={t('clickToExpand')}>
            {isCloudLocation ? (
              <CloudLocationIcon
                style={{
                  cursor: 'pointer'
                }}
                className={classes.icon}
              />
            ) : (
              <LocalLocationIcon
                style={{
                  cursor: 'pointer'
                }}
                className={classes.icon}
              />
            )}
          </Tooltip>
        </ListItemIcon>
        {isCloudLocation && !AppConfig.isElectron ? (
          <>{LocationTitle}</>
        ) : (
          <TargetMoveFileBox
            accepts={[DragItemTypes.FILE]}
            onDrop={handleFileMoveDrop}
            path={PlatformIO.getLocationPath(location)}
            location={location}
          >
            {LocationTitle}
          </TargetMoveFileBox>
        )}
        <ListItemSecondaryAction>
          <IconButton
            aria-label={t('core:options')}
            aria-haspopup="true"
            edge="end"
            data-tid={'locationMoreButton_' + location.name}
            onClick={event => handleLocationContextMenuClick(event)}
            onContextMenu={event => handleLocationContextMenuClick(event)}
            size="large"
          >
            {location.isDefault && (
              <Tooltip title={t('core:thisIsStartupLocation')}>
                <DefaultLocationIcon data-tid="startupIndication" />
              </Tooltip>
            )}
            <MoreVertIcon />
          </IconButton>
        </ListItemSecondaryAction>
      </ListItem>
      <DirectoryTreeView
        key={'tree_' + location.uuid}
        ref={directoryTreeRef}
        classes={classes}
        location={location}
        handleFileMoveDrop={handleFileMoveDrop}
      />
    </SidePanel>
  );
}

export default React.memo(LocationView);
