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

import React, { MutableRefObject, useRef } from 'react';
import { getUuid } from '@tagspaces/tagspaces-common/utils-io';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import DialogCloseButton from '-/components/dialogs/DialogCloseButton';
import { extractContainingDirectoryPath } from '@tagspaces/tagspaces-common/paths';
import DraggablePaper from '-/components/DraggablePaper';
import {
  actions as AppActions,
  AppDispatch,
  OpenedEntry
} from '-/reducers/app';
import { TS } from '-/tagspaces.namespace';
import { findExtensionsForEntry } from '-/services/utils-io';
import {
  getCurrentLanguage,
  getCurrentTheme,
  getSupportedFileTypes
} from '-/reducers/settings';
import { useSelector, useDispatch } from 'react-redux';
import FileView from '-/components/FileView';
import useEventListener from '-/utils/useEventListener';
import PlatformIO from '-/services/platform-facade';
import AppConfig from '-/AppConfig';
import { actions as LocationActions } from '-/reducers/locations';

interface Props {
  open: boolean;
  onClose: () => void;
  fsEntry: TS.FileSystemEntry;
}

function FilePreviewDialog(props: Props) {
  const { open = false, onClose, fsEntry } = props;
  const dispatch: AppDispatch = useDispatch();
  const language = useSelector(getCurrentLanguage);
  const supportedFileTypes = useSelector(getSupportedFileTypes);
  const currentTheme = useSelector(getCurrentTheme);
  const fileViewer: MutableRefObject<HTMLIFrameElement> = useRef<
    HTMLIFrameElement
  >(null);
  const fileViewerContainer: MutableRefObject<HTMLDivElement> = useRef<
    HTMLDivElement
  >(null);
  const eventID = useRef<string>(getUuid());

  const openedFile: OpenedEntry = fsEntry
    ? findExtensionsForEntry(
        fsEntry.uuid,
        supportedFileTypes,
        fsEntry.path,
        fsEntry.isFile
      )
    : undefined;

  useEventListener('message', e => {
    if (typeof e.data === 'string') {
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

  const handleMessage = (data: any) => {
    let message;
    let textFilePath;
    switch (
      data.command // todo use diff command
    ) {
      case 'loadDefaultTextContent':
        if (!openedFile || !openedFile.path) {
          break;
        }
        textFilePath = openedFile.path;

        /*if (
          fileViewer &&
          fileViewer.current &&
          fileViewer.current.contentWindow &&
          // @ts-ignore
          fileViewer.current.contentWindow.setTheme
        ) {
          // @ts-ignore call setContent from iframe
          fileViewer.current.contentWindow.setTheme(currentTheme);
        }*/

        dispatch(
          LocationActions.switchLocationType(openedFile.locationId)
        ).then((currentLocationId: string) => {
          PlatformIO.loadTextFilePromise(
            textFilePath,
            data.preview ? data.preview : false
          )
            .then(content => {
              const UTF8_BOM = '\ufeff';
              if (content.indexOf(UTF8_BOM) === 0) {
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
                  !openedFile.editMode,
                  currentTheme
                );
              }
              if (currentLocationId) {
                dispatch(
                  AppActions.switchCurrentLocationType(currentLocationId)
                );
              }
            })
            .catch(err => {
              console.warn('Error loading text content ' + err);
              if (currentLocationId) {
                dispatch(
                  AppActions.switchCurrentLocationType(currentLocationId)
                );
              }
            });
        });
        break;
    }
  };

  if (!fsEntry) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      keepMounted
      scroll="paper"
      fullWidth
      maxWidth="md"
      aria-labelledby="draggable-dialog-title"
      PaperComponent={DraggablePaper}
      PaperProps={{ sx: { width: '100%', height: '100%' } }}
      BackdropProps={{ style: { backgroundColor: 'transparent' } }}
    >
      <DialogTitle
        data-tid="importDialogTitle"
        style={{ cursor: 'move' }}
        id="draggable-dialog-title"
      >
        {/*{t('core:importDialogTitle')}*/}
        <DialogCloseButton testId="closeFilePreviewTID" onClose={onClose} />
      </DialogTitle>
      <DialogContent
        style={{
          marginLeft: 'auto',
          marginRight: 'auto',
          overflowY: 'hidden',
          width: '90%',
          flexGrow: 1
        }}
      >
        <p>{fsEntry.path}</p>
        <FileView
          key="FileViewPreviewID"
          openedFile={openedFile}
          fileViewer={fileViewer}
          fileViewerContainer={fileViewerContainer}
          height={'90%'}
          eventID={eventID.current}
        />
      </DialogContent>
    </Dialog>
  );
}

export default FilePreviewDialog;
