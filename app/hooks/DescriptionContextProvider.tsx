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
  useRef,
  useState
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  actions as AppActions,
  AppDispatch,
  isReadOnlyMode,
  OpenedEntry
} from '-/reducers/app';
import { Pro } from '-/pro';
import { useTranslation } from 'react-i18next';
import { useOpenedEntryContext } from '-/hooks/useOpenedEntryContext';

type DescriptionContextData = {
  description: string;
  isSaveDescriptionConfirmOpened: boolean;
  setSaveDescriptionConfirmOpened: (open: boolean) => void;
  setDescription: (description: string) => void;
  saveDescription: () => void;
};

export const DescriptionContext = createContext<DescriptionContextData>({
  description: undefined,
  isSaveDescriptionConfirmOpened: false,
  setSaveDescriptionConfirmOpened: () => {},
  setDescription: () => {},
  saveDescription: () => {}
});

export type DescriptionContextProviderProps = {
  children: React.ReactNode;
};

export const DescriptionContextProvider = ({
  children
}: DescriptionContextProviderProps) => {
  const { t } = useTranslation();
  const {
    openedEntries,
    addToEntryContainer,
    updateOpenedFile,
    reloadOpenedFile
  } = useOpenedEntryContext();
  const dispatch: AppDispatch = useDispatch();
  const readOnlyMode = useSelector(isReadOnlyMode);
  const openedFile = useRef<OpenedEntry>(openedEntries[0]);
  const isChanged = useRef<boolean>(false);
  const [
    isSaveDescriptionConfirmOpened,
    saveDescriptionConfirmOpened
  ] = useState<boolean>(false);

  useEffect(() => {
    if (openedEntries && openedEntries.length > 0) {
      if (
        openedFile.current !== undefined &&
        isChanged.current &&
        openedFile.current.path !== openedEntries[0].path &&
        openedFile.current.description !== openedEntries[0].description
      ) {
        // handle not saved changes
        addToEntryContainer({ ...openedFile.current, editMode: false });
        dispatch(AppActions.setSelectedEntries([]));
        saveDescriptionConfirmOpened(true);
      } else {
        openedFile.current = openedEntries[0];
      }
    } else {
      openedFile.current = undefined;
    }
  }, [openedEntries]);

  const saveDescription = () => {
    if (readOnlyMode) {
      return;
    }
    if (!Pro) {
      dispatch(
        AppActions.showNotification(t('core:thisFunctionalityIsAvailableInPro'))
      );
      return;
    }
    if (!Pro.MetaOperations) {
      dispatch(
        AppActions.showNotification(t('Saving description not supported'))
      );
      return;
    }
    if (openedFile.current.description !== undefined) {
      //forceUpdate();
      //setDescriptionChanged(false);
      if (openedFile.current.locationId) {
        dispatch(
          AppActions.switchLocationTypeByID(openedFile.current.locationId)
        ).then(currentLocationId => {
          saveMetaData()
            .then(() =>
              dispatch(AppActions.switchCurrentLocationType(currentLocationId))
            )
            .catch(error => {
              console.warn('Error saving description ' + error);
              dispatch(AppActions.switchCurrentLocationType(currentLocationId));
              dispatch(
                AppActions.showNotification(t('Error saving description'))
              );
            });
        });
      } else {
        console.debug(
          'openedFile:' +
            openedFile.current.path +
            ' dont have locationId! Current Location can be changed. Trying to save opened file in current location'
        );
        saveMetaData();
      }
    }
  };

  function saveMetaData() {
    return Pro.MetaOperations.saveFsEntryMeta(openedFile.current.path, {
      description: openedFile.current.description
    }).then(entryMeta => {
      openedFile.current.description = undefined;
      isChanged.current = false;
      return updateOpenedFile(openedFile.current.path, entryMeta);
    });
  }

  function setDescription(d: string) {
    openedFile.current.description = d;
    isChanged.current = true;
  }

  function setSaveDescriptionConfirmOpened(isOpened: boolean) {
    if (!isOpened) {
      isChanged.current = false;
      reloadOpenedFile();
    }
    saveDescriptionConfirmOpened(isOpened);
  }

  const context = useMemo(() => {
    return {
      description: openedFile.current.description,
      isSaveDescriptionConfirmOpened,
      setSaveDescriptionConfirmOpened,
      setDescription,
      saveDescription
    };
  }, [openedFile.current, isSaveDescriptionConfirmOpened]);

  return (
    <DescriptionContext.Provider value={context}>
      {children}
    </DescriptionContext.Provider>
  );
};
