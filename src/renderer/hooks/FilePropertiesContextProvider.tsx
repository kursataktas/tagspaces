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

import React, {
  createContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { Pro } from '-/pro';
import { useTranslation } from 'react-i18next';
import { useOpenedEntryContext } from '-/hooks/useOpenedEntryContext';
import { useCurrentLocationContext } from '-/hooks/useCurrentLocationContext';
import { useNotificationContext } from '-/hooks/useNotificationContext';
import { TS } from '-/tagspaces.namespace';
import { useIOActionsContext } from '-/hooks/useIOActionsContext';

type FilePropertiesContextData = {
  description: string;
  isSaveDescriptionConfirmOpened: boolean;
  isEditMode: boolean;
  setEditMode: (editMode: boolean) => void;
  isEditDescriptionMode: boolean;
  setEditDescriptionMode: (editMode: boolean) => void;
  setSaveDescriptionConfirmOpened: (open: boolean) => void;
  setDescription: (description: string) => void;
  saveDescription: () => void;
};

export const FilePropertiesContext = createContext<FilePropertiesContextData>({
  description: undefined,
  isSaveDescriptionConfirmOpened: false,
  isEditMode: false,
  setEditMode: () => {},
  isEditDescriptionMode: undefined,
  setEditDescriptionMode: undefined,
  setSaveDescriptionConfirmOpened: () => {},
  setDescription: () => {},
  saveDescription: undefined,
});

export type FilePropertiesContextProviderProps = {
  children: React.ReactNode;
};

export const FilePropertiesContextProvider = ({
  children,
}: FilePropertiesContextProviderProps) => {
  const { t } = useTranslation();
  const { openedEntry } = useOpenedEntryContext();
  const { findLocation } = useCurrentLocationContext();
  const { showNotification } = useNotificationContext();
  const { setDescriptionChange } = useIOActionsContext();
  //const description = useRef<string>(openedEntry.meta?.description);
  const lastOpenedFile = useRef<TS.OpenedEntry>(openedEntry);
  const isChanged = useRef<boolean>(false);
  const isEditMode = useRef<boolean>(false);
  const isEditDescriptionMode = useRef<boolean>(false);
  const [isSaveDescriptionConfirmOpened, saveDescriptionConfirmOpened] =
    useState<boolean>(false);
  const [ignored, forceUpdate] = useReducer((x) => x + 1, 0, undefined);

  useEffect(() => {
    if (openedEntry) {
      if (
        isChanged.current &&
        lastOpenedFile.current !== undefined &&
        lastOpenedFile.current.path !== openedEntry.path
      ) {
        // handle not saved changes
        saveDescriptionConfirmOpened(true);
      } else {
        isEditMode.current = false;
        isChanged.current = false;
        lastOpenedFile.current = { ...openedEntry };
        forceUpdate();
      }
    } else {
      lastOpenedFile.current = undefined;
    }
  }, [openedEntry]);

  const saveDescription = () => {
    if (lastOpenedFile.current !== undefined) {
      const location = findLocation(lastOpenedFile.current.locationID);
      if (!location || location.isReadOnly) {
        return;
      }
      if (!Pro) {
        showNotification(t('core:thisFunctionalityIsAvailableInPro'));
        return;
      }
      // to reload description
      lastOpenedFile.current = { ...lastOpenedFile.current };
      isChanged.current = false;
      isEditMode.current = false;
      forceUpdate();
      setDescriptionChange(
        lastOpenedFile.current,
        lastOpenedFile.current.meta?.description,
        lastOpenedFile.current.locationID,
      ).then(() => {
        if (lastOpenedFile.current.path !== openedEntry.path) {
          lastOpenedFile.current = { ...openedEntry };
        }
        // description.current = openedEntry.meta?.description;
      });
    }
  };

  function setDescription(d: string) {
    lastOpenedFile.current = {
      ...lastOpenedFile.current,
      meta: {
        ...(lastOpenedFile.current.meta && lastOpenedFile.current.meta),
        description: d,
      },
    };
    isChanged.current = true;
  }

  function setEditMode(editMode: boolean) {
    if (isEditMode.current !== editMode) {
      isEditMode.current = editMode;
      isChanged.current = false;
      lastOpenedFile.current = { ...openedEntry };
      forceUpdate();
    }
  }
  function setEditDescriptionMode(editMode: boolean) {
    if (isEditDescriptionMode.current !== editMode) {
      isEditDescriptionMode.current = editMode;
      forceUpdate();
    }
  }

  function setSaveDescriptionConfirmOpened(isOpened: boolean) {
    if (!isOpened) {
      isChanged.current = false;
      // reloadOpenedFile();
    }
    saveDescriptionConfirmOpened(isOpened);
  }

  const context = useMemo(() => {
    return {
      description: lastOpenedFile.current?.meta?.description,
      isSaveDescriptionConfirmOpened,
      setSaveDescriptionConfirmOpened,
      setDescription,
      saveDescription,
      isEditMode: isEditMode.current,
      setEditMode,
      isEditDescriptionMode: isEditDescriptionMode.current,
      setEditDescriptionMode,
    };
  }, [
    openedEntry,
    lastOpenedFile.current,
    isEditMode.current,
    isEditDescriptionMode.current,
    isSaveDescriptionConfirmOpened,
  ]);

  return (
    <FilePropertiesContext.Provider value={context}>
      {children}
    </FilePropertiesContext.Provider>
  );
};
