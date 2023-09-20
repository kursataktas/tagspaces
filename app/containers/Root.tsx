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

import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { Store } from 'redux';
import AppConfig from '-/AppConfig';
import { actions as AppActions } from '../reducers/app';
import App from '-/containers/App';
import MainPage from '-/containers/MainPage';
import TsAuth from '-/containers/TsAuth';
import init from '-/services/i18nInit';
import { FsActionsContextProvider } from '-/hooks/FsActionsContextProvider';
import { OpenedEntryContextProvider } from '-/hooks/OpenedEntryContextProvider';

type RootType = {
  store: Store<{}>;
  persistor: {};
};

export default function Root({ store, persistor }: RootType) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    init().then(() => setInitialized(true));
  }, []);

  if (!initialized) {
    return <span />;
  }

  let appContent = (
    <App>
      <OpenedEntryContextProvider>
        <FsActionsContextProvider>
          <MainPage />
        </FsActionsContextProvider>
      </OpenedEntryContextProvider>
    </App>
  );

  if (AppConfig.isWeb) {
    appContent = <TsAuth>{appContent}</TsAuth>;
  }

  return (
    <Provider
      // @ts-ignore
      store={store}
    >
      {/**
       * PersistGate delays the rendering of the app's UI until the persisted state has been retrieved
       * and saved to redux.
       * The `loading` prop can be `null` or any react instance to show during loading (e.g. a splash screen),
       * for example `loading={<SplashScreen />}`.
       * @see https://github.com/rt2zz/redux-persist/blob/master/docs/PersistGate.md
       */}
      <PersistGate
        // loading={<LoadingScreen />}
        onBeforeLift={() => {
          // eslint-disable-next-line react/prop-types
          if (!AppConfig.isAmplify) {
            // || store.app.user !== undefined
            // @ts-ignore
            store.dispatch(AppActions.initApp());
          }
        }}
        // @ts-ignore
        persistor={persistor}
      >
        {appContent}
      </PersistGate>
    </Provider>
  );
}
