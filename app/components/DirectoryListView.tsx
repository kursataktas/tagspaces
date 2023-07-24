import React, { useRef, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Button from '@mui/material/Button';
import NewFolderIcon from '@mui/icons-material/CreateNewFolder';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import List from '@mui/material/List';
import ListItemText from '@mui/material/ListItemText';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import FolderIcon from '@mui/icons-material/FolderOpen';
import { locationType } from '@tagspaces/tagspaces-common/misc';
import { extractContainingDirectoryPath } from '@tagspaces/tagspaces-common/paths';
import { getShowUnixHiddenEntries } from '-/reducers/settings';
import AppConfig from '-/AppConfig';
import i18n from '-/services/i18n';
import { TS } from '-/tagspaces.namespace';
import {
  actions as AppActions,
  AppDispatch,
  getCurrentLocationId
} from '-/reducers/app';
import { ParentFolderIcon } from '-/components/CommonIcons';
import { getLocations } from '-/reducers/locations';
import PlatformIO from '-/services/platform-facade';
import { Pro } from '-/pro';

interface Props {
  setTargetDir: (dirPath: string) => void;
  currentDirectoryPath?: string;
}
function DirectoryListView(props: Props) {
  const { currentDirectoryPath, setTargetDir } = props;
  const locations: Array<TS.Location> = useSelector(getLocations);
  const currentLocationId: string = useSelector(getCurrentLocationId);
  const showUnixHiddenEntries: boolean = useSelector(getShowUnixHiddenEntries);
  const chosenLocationId = useRef<string>(currentLocationId);
  const chosenDirectory = useRef<string>(currentDirectoryPath);
  const [directoryContent, setDirectoryContent] = useState<
    TS.FileSystemEntry[]
  >([]);

  useEffect(() => {
    const chosenLocation = locations.find(
      location => location.uuid === chosenLocationId.current
    );
    if (chosenLocation) {
      const path =
        chosenLocation.uuid === currentLocationId && currentDirectoryPath
          ? currentDirectoryPath
          : chosenLocation.path;
      listDirectory(path);
    }
  }, [chosenLocationId.current]);

  const dispatch: AppDispatch = useDispatch();

  const handleLocationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    chosenLocationId.current = event.target.value;
    const chosenLocation = locations.find(
      location => location.uuid === chosenLocationId.current
    );
    if (chosenLocation) {
      listDirectory(chosenLocation.path);
      setTargetDir(chosenLocation.path);
    }
  };

  function getDirLocations() {
    const currentLocation = locations.find(
      location => location.uuid === chosenLocationId.current
    );
    if (currentLocation.type !== locationType.TYPE_LOCAL) {
      return null;
    }
    return (
      <Select
        onChange={handleLocationChange}
        fullWidth
        value={chosenLocationId.current}
      >
        {locations
          .filter(loc => loc.type === locationType.TYPE_LOCAL)
          .map((location: TS.Location) => (
            <MenuItem key={location.uuid} value={location.uuid}>
              <span style={{ width: '100%' }}>{location.name}</span>
            </MenuItem>
          ))}
      </Select>
    );
  }

  function listDirectory(directoryPath) {
    chosenDirectory.current = directoryPath;
    PlatformIO.listDirectoryPromise(
      directoryPath,
      [], // mode,
      []
    )
      .then(results => {
        if (results !== undefined) {
          setDirectoryContent(
            results.filter(entry => {
              return (
                !entry.isFile &&
                entry.name !== AppConfig.metaFolder &&
                !entry.name.endsWith('/' + AppConfig.metaFolder) &&
                !(!showUnixHiddenEntries && entry.name.startsWith('.'))
              );
            })
            // .sort((a, b) => b.name - a.name)
          );
          // props.setTargetDir(directoryPath);
        }
        return true;
      })
      .catch(error => {
        console.error('listDirectoryPromise', error);
      });
  }

  function getFolderContent() {
    if (directoryContent && directoryContent.length > 0) {
      return directoryContent.map(entry => (
        <ListItem
          key={entry.path}
          data-tid={'MoveTarget' + entry.name}
          title={'Navigate to: ' + entry.path}
          onClick={() => {
            setTargetDir(entry.path);
          }}
          onDoubleClick={() => {
            listDirectory(entry.path);
          }}
        >
          <ListItemIcon style={{ minWidth: 35 }}>
            <FolderIcon />
          </ListItemIcon>
          <ListItemText primary={entry.name} />
        </ListItem>
      ));
    }
    return (
      <div style={{ padding: 10 }}>{i18n.t('core:noSubFoldersFound')}</div>
    );
  }

  return (
    <div style={{ marginTop: 10 }}>
      {getDirLocations()}
      <Button
        variant="text"
        startIcon={<ParentFolderIcon />}
        style={{ margin: 5 }}
        data-tid="navigateToParentTID"
        onClick={() => {
          if (chosenDirectory.current) {
            let currentPath = chosenDirectory.current;
            if (currentPath.endsWith(PlatformIO.getDirSeparator())) {
              currentPath = currentPath.slice(0, -1);
            }
            const parentDir = extractContainingDirectoryPath(currentPath);
            listDirectory(parentDir);
            setTargetDir(parentDir);
          }
        }}
      >
        {i18n.t('core:navigateToParentDirectory')}
      </Button>
      <Button
        variant="text"
        startIcon={<NewFolderIcon />}
        style={{ margin: 5 }}
        data-tid="newSubdirectoryTID"
        onClick={() => {
          if (Pro && Pro.Watcher) {
            Pro.Watcher.stopWatching();
          }
          dispatch(
            AppActions.toggleCreateDirectoryDialog({
              rootDirPath: chosenDirectory.current,
              callback: newDirPath => {
                listDirectory(chosenDirectory.current);
                setTargetDir(newDirPath);
                dispatch(AppActions.watchForChanges());
              },
              reflect: false
            })
          );
        }}
      >
        {i18n.t('core:newSubdirectory')}
      </Button>
      <List
        dense
        style={{
          borderRadius: 5,
          maxHeight: 300,
          overflowY: 'auto'
        }}
      >
        {getFolderContent()}
      </List>
    </div>
  );
}

export default DirectoryListView;
