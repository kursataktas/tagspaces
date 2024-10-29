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

import React, { useState } from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import ColorPicker from 'react-best-gradient-color-picker';
import DialogCloseButton from '-/components/dialogs/DialogCloseButton';
import { useTranslation } from 'react-i18next';

const presetColors = [
  '#ffffff',
  '#000000',
  '#ac725e',
  '#d06b64',
  '#f83a22',
  '#fa573c',
  '#ff7537',
  '#ffad46',
  '#42d692',
  '#008000',
  '#7bd148',
  '#fad165',
  '#FFCC24',
  '#92e1c0',
  '#9fe1e7',
  '#9fc6e7',
  '#4986e7',
  '#9a9cff',
  '#b99aff',
  '#c2c2c2',
  '#cabdbf',
  '#cca6ac',
  '#f691b2',
  '#cd74e6',
  '#a47ae2',
];

interface Props {
  open: boolean;
  color: string;
  setColor: (color: string) => void;
  presetColors?: Array<string>;
  onClose: () => void;
}

function ColorPickerDialog(props: Props) {
  const { t } = useTranslation();
  const [color, setColor] = useState(undefined);
  const { open = false, onClose } = props;

  function onConfirm() {
    // if (color && colorHex) {
    //  const hexAlphaColor = colorHex + Math.round(color.a * 255).toString(16);
    props.setColor(color);
    //}
    props.onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      keepMounted
      scroll="paper"
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.keyCode === 13) {
          event.preventDefault();
          event.stopPropagation();
          onConfirm();
        }
      }}
    >
      <DialogTitle data-tid="colorPickerDialogTitle">
        {t('core:colorPickerDialogTitle')}
        <DialogCloseButton testId="closeColorPickerTID" onClose={onClose} />
      </DialogTitle>
      <DialogContent
        data-tid="colorPickerDialogContent"
        style={{
          marginLeft: 'auto',
          marginRight: 'auto',
          overflowX: 'hidden',
        }}
      >
        <ColorPicker
          value={color || props.color}
          onChange={(newColor) => setColor(newColor)}
          presets={props.presetColors ? props.presetColors : presetColors}
          hideEyeDrop
          disableDarkMode
          hideControls
          // @ts-ignore
          style={{ backgroundColor: 'transparent' }}
        />
      </DialogContent>
      <DialogActions>
        <Button data-tid="colorPickerCloseDialog" onClick={props.onClose}>
          {t('core:cancel')}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          data-tid="colorPickerConfirm"
          color="primary"
        >
          {t('core:ok')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ColorPickerDialog;
