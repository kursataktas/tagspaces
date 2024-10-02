/**
 * TagSpaces - universal file and folder organizer
 * Copyright (C) 2017-present TagSpaces GmbH
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

import React, { useState, useEffect } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputAdornment from '@mui/material/InputAdornment';
import Dialog from '@mui/material/Dialog';
import DialogCloseButton from '-/components/dialogs/DialogCloseButton';
// import useMediaQuery from '@mui/material/useMediaQuery';
import InfoIcon from '-/components/InfoIcon';
import { useTranslation } from 'react-i18next';
import { useOpenedEntryContext } from '-/hooks/useOpenedEntryContext';

interface Props {
  open: boolean;
  onClose: () => void;
}

function OpenLinkDialog(props: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const { openLink } = useOpenedEntryContext();
  const [inputError, setInputError] = useState(false);
  const [disableConfirmButton, setDisableConfirmButton] = useState(true);
  const [linkURL, setLinkURL] = useState('');
  const { open, onClose } = props;

  useEffect(() => {
    handleValidation();
  });

  function handleValidation() {
    let validURL = true;
    try {
      // eslint-disable-next-line no-new
      new URL(linkURL);
    } catch (e) {
      validURL = false;
    }
    if (validURL) {
      setInputError(false);
      setDisableConfirmButton(false);
    } else {
      setInputError(true);
      setDisableConfirmButton(true);
    }
  }

  function onConfirm() {
    if (!disableConfirmButton && linkURL) {
      openLink(linkURL, { fullWidth: false });
      resetState();
      props.onClose();
    }
  }

  function onCancel() {
    resetState();
    props.onClose();
  }

  function resetState() {
    setLinkURL('');
    setInputError(false);
    setDisableConfirmButton(true);
  }

  const [contextMenu, setContextMenu] = React.useState<{
    mouseX: number;
    mouseY: number;
  } | null>(null);

  const handleContextMenu = (event) => {
    event.preventDefault();
    setContextMenu(
      contextMenu === null
        ? {
            mouseX: event.clientX + 2,
            mouseY: event.clientY - 6,
          }
        : null,
    );
  };

  const handleClose = () => {
    setContextMenu(null);
  };

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(linkURL);
      handleClose();
    } catch (error) {
      console.error(error.message);
      handleClose();
    }
  }

  async function handlePaste() {
    navigator.clipboard.readText().then((clipText) => {
      setLinkURL(clipText);
      handleClose();
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.keyCode === 13) {
          event.preventDefault();
          event.stopPropagation();
          onConfirm();
        }
      }}
    >
      <DialogTitle>
        {t('core:openLink')}
        <DialogCloseButton testId="closeOpenLinkTID" onClose={onClose} />
      </DialogTitle>
      <DialogContent style={{ minWidth: fullScreen ? 100 : 400 }}>
        <FormControl fullWidth={true} error={inputError}>
          <TextField
            fullWidth
            margin="dense"
            autoFocus
            name="name"
            label={t('core:link')}
            onContextMenu={handleContextMenu}
            style={{ cursor: 'context-menu' }}
            onChange={(event) => {
              const { target } = event;
              setLinkURL(target.value);
            }}
            value={linkURL}
            data-tid="openLinkTID"
            InputProps={{
              endAdornment: (
                <InputAdornment position="start">
                  <InfoIcon tooltip="TagSpace links begin with ts://? and are used for internal sharing of files and folders" />
                </InputAdornment>
              ),
            }}
          />
          <Menu
            open={contextMenu !== null}
            onClose={handleClose}
            anchorReference="anchorPosition"
            anchorPosition={
              contextMenu !== null
                ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                : undefined
            }
          >
            <MenuItem onClick={handleCopy}>Copy</MenuItem>
            <MenuItem onClick={handlePaste}>Paste</MenuItem>
          </Menu>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button data-tid="closeOpenLinkDialog" onClick={onCancel}>
          {t('core:cancel')}
        </Button>
        <Button
          disabled={disableConfirmButton}
          onClick={onConfirm}
          data-tid="confirmOpenLink"
          color="primary"
          variant="contained"
        >
          {t('core:open')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default OpenLinkDialog;
