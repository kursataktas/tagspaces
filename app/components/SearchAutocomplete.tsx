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

import React, { useEffect, useReducer, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { format, formatDistanceToNow } from 'date-fns';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import Button from '@mui/material/Button';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import Tooltip from '-/components/Tooltip';
import IconButton from '@mui/material/IconButton';
import ClearSearchIcon from '@mui/icons-material/Close';
import AdvancedSearchIcon from '@mui/icons-material/TuneOutlined';
import DropDownIcon from '@mui/icons-material/ArrowDropDownOutlined';
import {
  actions as AppActions,
  AppDispatch,
  getDirectoryPath,
  isSearchMode
} from '../reducers/app';
import {
  actions as LocationIndexActions,
  isIndexing,
  getSearchQuery
} from '../reducers/location-index';
import {
  getMaxSearchResults,
  getShowUnixHiddenEntries,
  getCurrentLanguage
} from '-/reducers/settings';
import i18n from '-/services/i18n';
import { FileTypeGroups, haveSearchFilters } from '-/services/search';
import { TS } from '-/tagspaces.namespace';
import { Pro } from '-/pro';
import useFirstRender from '-/utils/useFirstRender';
import SavedSearchesMenu from '-/components/menus/SavedSearchesMenu';
import AppConfig from '-/AppConfig';
import { Autocomplete, Box, TextField } from '@mui/material';
import {
  accuracy,
  ActionType,
  ExecActions,
  FileSize,
  findAction,
  isAction,
  LastModified,
  scope,
  ScopeType,
  SearchActions,
  SearchOptionType,
  SearchQueryComposition
} from '-/components/SearchOptions';
import { getCurrentLocation, getLocations } from '-/reducers/locations';
import CloseIcon from '@mui/icons-material/Close';
import { getTagLibrary } from '-/services/taglibrary-utils';
import { getSearches } from '-/reducers/searches';
import { getSearchOptions } from '-/components/SearchOptionsMenu';
import { dataTidFormat } from '-/services/test';
import { useTheme } from '@mui/material/styles';

interface Props {
  style?: any;
  open: boolean;
  textQuery: string;
  setTextQuery: (value: string) => void;
  setAnchorSearch: (el: HTMLButtonElement) => void;
}

/*const useStyles = makeStyles(theme => ({
  customWidth: {
    maxWidth: 550
  },
  noMaxWidth: {
    maxWidth: 'none'
  }
}));*/

function SearchAutocomplete(props: Props) {
  const theme = useTheme();
  const dispatch: AppDispatch = useDispatch();
  const indexing = useSelector(isIndexing);
  const searchQuery: TS.SearchQuery = useSelector(getSearchQuery);
  // const isDesktop = useSelector(isDesktopMode);
  const currentDirectory = useSelector(getDirectoryPath);
  const maxSearchResults = useSelector(getMaxSearchResults);
  const showUnixHiddenEntries = useSelector(getShowUnixHiddenEntries);
  const language = useSelector(getCurrentLanguage);
  const locations: TS.Location[] = useSelector(getLocations);
  const currentLocation: TS.Location = useSelector(getCurrentLocation);
  const searchMode: boolean = useSelector(isSearchMode);
  const searches: Array<TS.SearchQuery> = useSelector(getSearches);

  const openLinkDispatch = (link, options) =>
    dispatch(AppActions.openLink(link, options));
  const openLocationByIdDispatch = locationId =>
    dispatch(AppActions.openLocationById(locationId));
  const openEntryDispatch = entryPath =>
    dispatch(AppActions.openEntry(entryPath));

  const { setTextQuery, textQuery, open, setAnchorSearch } = props;
  // const [, forceUpdate] = useReducer(x => x + 1, 0);
  const [
    openSavedSearches,
    setOpenSavedSearches
  ] = useState<null | HTMLElement>(null);
  const searchOptions = useRef<Array<SearchOptionType>>(getSearchOptions());
  const currentOptions = useRef<string>(undefined);
  // const textQueryMask = useRef<string>('');
  const fileTypes = useRef<Array<string>>(
    searchQuery.fileTypes ? searchQuery.fileTypes : FileTypeGroups.any
  );
  const [ignored, forceUpdate] = useReducer(x => x + 1, 0);

  /*function parseSearchQuery(textQuery: string) {
    if (textQuery) {
      return execActions(textQuery.split(' '), []);
    }
    return [];
  }*/

  const actionValues = useRef<Array<SearchOptionType>>(
    [] //parseSearchQuery(textQueryMask.current)
  );
  const [searchBoxing, setSearchBoxing] = useState<ScopeType>(
    searchQuery.searchBoxing || 'location'
  );

  const searchType = useRef<'fuzzy' | 'semistrict' | 'strict'>(
    searchQuery.searchType ? searchQuery.searchType : 'fuzzy'
  );
  const lastModified = useRef<string>(
    searchQuery.lastModified ? searchQuery.lastModified : ''
  );
  const tagTimePeriod = useRef<string>('');
  const tagTimePeriodHelper = useRef<string>(' ');
  const tagTimePeriodFrom = useRef<number | null>(
    searchQuery.tagTimePeriodFrom ? searchQuery.tagTimePeriodFrom : null
  );
  const tagTimePeriodTo = useRef<number | null>(
    searchQuery.tagTimePeriodTo ? searchQuery.tagTimePeriodTo : null
  );
  const [tagPlaceLat, setTagPlaceLat] = useState<number | null>(null);
  const [tagPlaceLong, setTagPlaceLong] = useState<number | null>(null);
  // const [tagPlaceRadius, setTagPlaceRadius] = useState<number>(0);
  const forceIndexing = useRef<boolean>(
    searchQuery.forceIndexing ? searchQuery.forceIndexing : false
  );
  const fileSize = useRef<string>(
    searchQuery.fileSize ? searchQuery.fileSize : ''
  );

  // const mainSearchField = useRef<HTMLInputElement>(null);
  const isOpen = useRef<boolean>(true);

  const firstRender = useFirstRender();
  const historyKeys = Pro && Pro.history ? Pro.history.historyKeys : {};

  useEffect(() => {
    if (!firstRender) {
      if (!searchMode) {
        clearSearch();
      }
    }
  }, [searchMode]);

  /* let searchBoxingName = i18n.t('location');
  if (searchBoxing === 'global') {
    searchBoxingName = i18n.t('globalSearch');
  } else if (searchBoxing === 'folder') {
    searchBoxingName = i18n.t('folder');
  }*/

  useEffect(() => {
    if (Object.keys(searchQuery).length > 0) {
      let emptySearch = true;
      const actions: SearchOptionType[] = [];
      // textQueryMask.current = '';

      if (searchQuery.tagsAND && searchQuery.tagsAND.length > 0) {
        searchQuery.tagsAND.forEach(tag => {
          // textQueryMask.current += ' +' + tag.title;

          actions.push({
            action: SearchQueryComposition.TAG_AND.shortName,
            label: SearchQueryComposition.TAG_AND.shortName + tag.title
          });
        });
        emptySearch = false;
      }
      if (searchQuery.tagsOR && searchQuery.tagsOR.length > 0) {
        searchQuery.tagsOR.forEach(tag => {
          // textQueryMask.current += ' |' + tag.title;
          actions.push({
            action: SearchQueryComposition.TAG_OR.shortName,
            label: SearchQueryComposition.TAG_OR.shortName + tag.title
          });
        });
        emptySearch = false;
      }
      if (searchQuery.tagsNOT && searchQuery.tagsNOT.length > 0) {
        searchQuery.tagsNOT.forEach(tag => {
          // textQueryMask.current += ' -' + tag.title;
          actions.push({
            action: SearchQueryComposition.TAG_NOT.shortName,
            label: SearchQueryComposition.TAG_NOT.shortName + tag.title
          });
        });
        emptySearch = false;
      }

      // inputValue.current = getInputValue();
      let txtQuery = '';
      if (searchQuery.textQuery) {
        setTextQuery(searchQuery.textQuery);
        txtQuery = searchQuery.textQuery;
        emptySearch = false;
      } else if (textQuery) {
        txtQuery = textQuery;
        emptySearch = false;
      }

      if (searchQuery.searchBoxing) {
        setSearchBoxing(searchQuery.searchBoxing);
        emptySearch = false;
        actions.push({
          action: SearchQueryComposition.SCOPE.fullName,
          label:
            SearchQueryComposition.SCOPE.fullName +
            ' ' +
            searchQuery.searchBoxing
        });
      }
      if (
        searchQuery.fileTypes &&
        JSON.stringify(searchQuery.fileTypes) !==
          JSON.stringify(FileTypeGroups.any)
      ) {
        fileTypes.current = searchQuery.fileTypes;
        emptySearch = false;
        let keyFileType;
        Object.entries(FileTypeGroups).forEach(([key, value]) => {
          if (JSON.stringify(value) === JSON.stringify(searchQuery.fileTypes)) {
            keyFileType = key;
          }
        });
        actions.push({
          action: SearchQueryComposition.TYPE.fullName,
          label:
            SearchQueryComposition.TYPE.fullName +
            ' ' +
            (keyFileType
              ? i18n.t('core:' + keyFileType)
              : searchQuery.fileTypes)
        });
      }
      if (searchQuery.searchType) {
        searchType.current = searchQuery.searchType;
        emptySearch = false;
        actions.push({
          action: SearchQueryComposition.ACCURACY.fullName,
          label:
            SearchQueryComposition.ACCURACY.fullName +
            ' ' +
            i18n.t('core:' + searchQuery.searchType)
        });
      }
      if (searchQuery.lastModified) {
        lastModified.current = searchQuery.lastModified;
        emptySearch = false;
        actions.push({
          action: SearchQueryComposition.LAST_MODIFIED.fullName,
          label:
            SearchQueryComposition.LAST_MODIFIED.fullName +
            ' ' +
            i18n.t('core:' + searchQuery.lastModified)
        });
      }
      if (searchQuery.tagTimePeriodFrom) {
        tagTimePeriodFrom.current = searchQuery.tagTimePeriodFrom;
        emptySearch = false;
      }
      if (searchQuery.tagTimePeriodTo) {
        tagTimePeriodTo.current = searchQuery.tagTimePeriodTo;
        emptySearch = false;
      }
      if (searchQuery.forceIndexing) {
        forceIndexing.current = searchQuery.forceIndexing;
      }
      if (searchQuery.fileSize) {
        fileSize.current = searchQuery.fileSize;
        emptySearch = false;
        actions.push({
          action: SearchQueryComposition.SIZE.fullName,
          label:
            SearchQueryComposition.SIZE.fullName +
            ' ' +
            i18n.t('core:' + searchQuery.fileSize)
        });
      }
      if (!emptySearch) {
        if (actions.length > 0) {
          actionValues.current = execActions(
            actions,
            actionValues.current,
            false
          );
          isOpen.current = false;
          forceUpdate();
        }
        if (searchQuery.executeSearch) {
          const sQuery = {
            ...searchQuery,
            textQuery: txtQuery
          };
          if (searchBoxing === 'global') {
            dispatch(LocationIndexActions.searchAllLocations(sQuery));
          } else {
            dispatch(LocationIndexActions.searchLocationIndex(sQuery));
          }
        }
      } /*else {
        clearSearch();
      }*/
    }
  }, [searchQuery]);

  /*function getInputValue() {
    const txtQuery = removeActionsFromQuery(
      inputValue.current.trim(),
      actionValues.current
    );
    // txtQuery = removeAllTagsFromSearchQuery(txtQuery);
    if (txtQuery) {
      return txtQuery;
    }
    return '';
  }*/
  /*const toggleSearchBoxing = () => {
    if (searchBoxing === 'location') {
      setSearchBoxing('folder');
    } else if (searchBoxing === 'folder' && Pro) {
      setSearchBoxing('global');
    } else {
      setSearchBoxing('location');
    }
  };*/

  const clickSearchButton = () => {
    executeSearch();
  };

  const onKeyDownHandler = event => {
    if (event.key === 'Enter' || event.keyCode === 13) {
      if (!isOpen.current) {
        executeSearch();
      } else {
        isOpen.current = false;
        forceUpdate();
      }
    } else if (event.key === 'Escape' || event.keyCode === 27) {
      clearSearch();
    } else if (event.key === 'ArrowDown' || event.keyCode === 40) {
      if (!isOpen.current) {
        isOpen.current = true;
        forceUpdate();
      }
    } else if (event.key === 'Backspace' || event.keyCode === 8) {
      if (textQuery.length === 0 && actionValues.current.length > 0) {
        actionValues.current = actionValues.current.slice(0, -1);
        resetActions(actionValues.current);
        isOpen.current = true;
        forceUpdate();
      }
    } else {
      isOpen.current = true;
    }
  };

  function resetValues(exceptions: Array<SearchOptionType>) {
    setTextQuery('');
    if (
      !exceptions.some(action =>
        isAction(action.action, SearchQueryComposition.SCOPE)
      )
    ) {
      setSearchBoxing('location');
    }
    if (
      !exceptions.some(action =>
        isAction(action.action, SearchQueryComposition.ACCURACY)
      )
    ) {
      searchType.current = 'fuzzy';
    }
    if (
      !exceptions.some(action =>
        isAction(action.action, SearchQueryComposition.TYPE)
      )
    ) {
      fileTypes.current = FileTypeGroups.any;
    }
    if (
      !exceptions.some(action =>
        isAction(action.action, SearchQueryComposition.LAST_MODIFIED)
      )
    ) {
      lastModified.current = '';
    }
    tagTimePeriod.current = '';
    tagTimePeriodHelper.current = ' ';
    tagTimePeriodFrom.current = null;
    tagTimePeriodTo.current = null;
    setTagPlaceLat(null);
    setTagPlaceLong(null);
    forceIndexing.current = false;
    if (
      !exceptions.some(action =>
        isAction(action.action, SearchQueryComposition.SIZE)
      )
    ) {
      fileSize.current = '';
    }
  }
  const clearSearch = () => {
    resetValues([]);
    dispatch(LocationIndexActions.setSearchQuery({}));
    dispatch(AppActions.exitSearchMode());
    dispatch(AppActions.watchForChanges());
  };

  function removeActionsFromQuery(
    query: string,
    actions: Array<SearchOptionType>
  ) {
    if (actions && actions.length > 0) {
      const queryArr = query
        .split(' ')
        .filter(q => actions.some(action => q !== action.label));
      return queryArr.join(' ');
    }
    return query;
  }

  /*const removeTagsFromQuery = (
    tags: Array<TS.Tag>,
    query: string,
    identifier: string
  ) => {
    if (tags) {
      let newQuery = query
        .trim()
        .replace(
          new RegExp(escapeRegExp(identifier) + '\\s+', 'g'),
          identifier
        );
      tags.forEach(tag => {
        newQuery = newQuery.replace(identifier + tag.title, '');
      });

      return newQuery.trim();
    }

    return query;
  };*/

  const handleOpenSavedSearches = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    setOpenSavedSearches(event.currentTarget);
  };

  // const classes = useStyles();

  function HelpTooltip(hClasses) {
    return (
      <Tooltip
        title={
          <span style={{ fontSize: 14 }}>
            The search query consists of a tag part and a search term. This term
            is optional and can be a single word. The tag part can have one or
            more tags preceded by the following symbols:
            <ul>
              <li>
                + will add only entries having this tag in the search results
                (logical AND)
              </li>
              <li>
                | will include all entries having this tag in the search results
                (logical OR)
              </li>
              <li>
                - will exclude entries having this tags from the search results
              </li>
            </ul>
            Example queries:
            <ul>
              <li>
                "italy +beach -sunset" - will find all files and folders having
                italy in their name and the tag beach but not sunset
              </li>
              <li>
                "|beach |sunset" - will find all files and folder having the
                tags beach or sunset
              </li>
            </ul>
          </span>
        }
      >
        <IconButton size="small" edge="end">
          <HelpOutlineIcon style={{ color: 'lightgray' }} />
        </IconButton>
      </Tooltip>
    );
  }

  function getTags(
    actions: Array<SearchOptionType>,
    action: ActionType
  ): TS.Tag[] {
    if (actions.length > 0) {
      const actionsArr = actions.filter(a => isAction(a.action, action));
      if (actionsArr.length > 0) {
        return actionsArr.map(a => ({
          title:
            a.label.indexOf(action.shortName) === 0
              ? a.label.substring(action.shortName.length)
              : action.fullName && a.label.indexOf(action.fullName) === 0
              ? a.label.substring(action.fullName.length)
              : a.label
        }));
      }
    }
    return [];
  }

  const executeSearch = () => {
    if (
      actionValues.current.some(action =>
        isAction(action.action, SearchActions.FILTER)
      )
    ) {
      // don't execute search on search filter
      return;
    }
    if (
      textQuery.startsWith('ts:?ts') ||
      textQuery.startsWith(AppConfig.tsProtocol + '?ts')
    ) {
      openLinkDispatch(textQuery, { fullWidth: false });
      clearSearch();
      return;
    }
    const tagsAND = getTags(
      actionValues.current,
      SearchQueryComposition.TAG_AND
    );
    const tagsOR = getTags(actionValues.current, SearchQueryComposition.TAG_OR);
    const tagsNOT = getTags(
      actionValues.current,
      SearchQueryComposition.TAG_NOT
    );
    // const tagsAND = parseTextQuery(textQuery.current, '+');
    // query = removeTagsFromQuery(tagsAND, query, '+');
    // const tagsOR = parseTextQuery(textQuery.current, '|');
    // query = removeTagsFromQuery(tagsOR, query, '|');
    // const tagsNOT = parseTextQuery(textQuery.current, '-');
    // query = removeTagsFromQuery(tagsNOT, query, '-');
    // query = removeActionsFromQuery(query, actionValues.current);

    const sQuery: TS.SearchQuery = {
      textQuery: textQuery,
      tagsAND,
      tagsOR,
      tagsNOT,
      searchBoxing,
      searchType: searchType.current,
      fileTypes: fileTypes.current,
      lastModified: lastModified.current,
      fileSize: fileSize.current,
      tagTimePeriodFrom: tagTimePeriodFrom.current,
      tagTimePeriodTo: tagTimePeriodTo.current,
      tagPlaceLat,
      tagPlaceLong,
      // tagPlaceRadius,
      maxSearchResults: maxSearchResults,
      currentDirectory: currentDirectory,
      forceIndexing: forceIndexing.current,
      showUnixHiddenEntries: showUnixHiddenEntries,
      executeSearch: true
    };
    if (!haveSearchFilters(sQuery)) {
      clearSearch();
    } else {
      console.log('Search object: ' + JSON.stringify(sQuery));
      dispatch(LocationIndexActions.setSearchQuery(sQuery));
    }
  };

  /*function parseOptions(options: Array<any>) {

    const parsed = [];
    let prevAction;
    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      let label, action;
      if (typeof option === 'object') {
        label = option.label;
        action = option.label;
      } else {
        label = option;
        action = Object.values(SearchActions).find(a => option.startsWith(a));
      }
      if (!action) {
        parsed.push(option);
      }
      prevAction = action;
    }
    return parsed;
  }*/

  function getHistoryOptions(
    items: TS.HistoryItem[],
    group: string
  ): SearchOptionType[] {
    if (!items) {
      return [];
    }
    return items.map((item: TS.HistoryItem) => ({
      id: item.lid,
      descr: formatDistanceToNow(item.creationTimeStamp, {
        includeSeconds: true,
        addSuffix: true
        // locale: https://date-fns.org/v2.29.3/docs/formatDistanceToNow#usage
      }),
      action: ExecActions.OPEN_HISTORY,
      fullName: item.url,
      label: item.path,
      group: group,
      ...(item.searchQuery && { searchQuery: item.searchQuery })
    }));
  }

  function changeOptions(action: string, filter = true) {
    let optionsChanged = false;
    if (isAction(action, SearchActions.LOCATION)) {
      if (currentOptions.current !== action) {
        currentOptions.current = action;
        searchOptions.current = locations.map(location => {
          return {
            id: location.uuid,
            descr: location.path,
            action: ExecActions.OPEN_LOCATION,
            label: location.name,
            filter
          };
        });
        optionsChanged = true;
      }
    } else if (isAction(action, SearchActions.HISTORY)) {
      if (currentOptions.current !== action) {
        currentOptions.current = action;

        const fileOpenHistoryItems: Array<TS.HistoryItem> = Pro
          ? Pro.history.getHistory(historyKeys.fileOpenKey)
          : [];
        const folderOpenHistoryItems: Array<TS.HistoryItem> = Pro
          ? Pro.history.getHistory(historyKeys.folderOpenKey)
          : [];
        const fileEditHistoryItems: Array<TS.HistoryItem> = Pro
          ? Pro.history.getHistory(historyKeys.fileEditKey)
          : [];

        searchOptions.current = [
          ...getHistoryOptions(
            fileOpenHistoryItems,
            i18n.t('core:fileOpenHistory')
          ),
          ...getHistoryOptions(
            folderOpenHistoryItems,
            i18n.t('core:folderOpenHistory')
          ),
          ...getHistoryOptions(
            fileEditHistoryItems,
            i18n.t('core:fileEditHistory')
          )
        ];
      }
    } else if (isAction(action, SearchActions.BOOK)) {
      if (currentOptions.current !== action) {
        currentOptions.current = action;
        const bookmarks: Array<TS.BookmarkItem> =
          Pro && Pro.bookmarks && Pro.bookmarks.getBookmarks();

        function getOptions(
          items: TS.BookmarkItem[],
          group: string
        ): SearchOptionType[] {
          if (!items) {
            return [];
          }
          return items.map((item: TS.BookmarkItem) => ({
            id: item.creationTimeStamp.toString(),
            descr:
              '(' + format(item.creationTimeStamp, 'yyyy-MM-dd HH:mm') + ')',
            action: ExecActions.OPEN_BOOKMARK,
            fullName: item.url,
            label: item.path,
            group: group,
            filter
          }));
        }

        searchOptions.current = getOptions(
          bookmarks,
          i18n.t('core:searchBookmarks')
        );
      }
    } else if (isAction(action, SearchActions.SEARCH_HISTORY)) {
      const searchHistoryItems: Array<TS.HistoryItem> = Pro
        ? Pro.history.getHistory(historyKeys.searchHistoryKey)
        : [];
      searchOptions.current = getHistoryOptions(
        searchHistoryItems,
        i18n.t('core:searchHistory')
      );
    } else if (isAction(action, SearchActions.SEARCH)) {
      if (currentOptions.current !== action) {
        currentOptions.current = action;

        function getOptions(
          items: TS.SearchQuery[],
          group: string
        ): SearchOptionType[] {
          if (!items) {
            return [];
          }
          return items.map((item: TS.SearchQuery) => ({
            id: item.uuid,
            action: ExecActions.OPEN_SAVED_SEARCHES,
            label: item.title,
            fullName: JSON.stringify(item),
            group: group,
            filter
          }));
        }

        searchOptions.current = getOptions(
          searches,
          i18n.t('core:savedSearchesTitle')
        );
      }
    } else if (
      isAction(action, SearchQueryComposition.TAG_AND) ||
      isAction(action, SearchQueryComposition.TAG_OR) ||
      isAction(action, SearchQueryComposition.TAG_NOT)
    ) {
      /*if (
        currentOptions.current !== SearchQueryComposition.TAG_AND ||
        currentOptions.current !== SearchQueryComposition.TAG_OR ||
        currentOptions.current !== SearchQueryComposition.TAG_NOT
      ) {*/
      currentOptions.current = action;
      const searchAction = toExecAction(action);
      const tagGroups = getTagLibrary();
      const options = [];
      for (let j = 0; j < tagGroups.length; j++) {
        tagGroups[j].children.forEach((tag: TS.Tag) => {
          options.push({
            id: tag.id,
            action: searchAction,
            label: tag.title,
            color: tag.color,
            textcolor: tag.textcolor,
            group: tagGroups[j].title,
            filter
          });
        });
      }
      searchOptions.current = options;
      optionsChanged = true;
    } else if (isAction(action, SearchQueryComposition.TYPE)) {
      if (currentOptions.current !== SearchQueryComposition.TYPE.shortName) {
        currentOptions.current = action;
        const options = [];
        Object.entries(FileTypeGroups).forEach(([key, value]) => {
          options.push({
            id: key,
            action: ExecActions.TYPE_SEARCH,
            label: i18n.t('core:' + key),
            descr: value.join(', '),
            filter
          });
        });
        searchOptions.current = options;
        optionsChanged = true;
      }
    } else if (isAction(action, SearchQueryComposition.SIZE)) {
      if (currentOptions.current !== SearchQueryComposition.SIZE.shortName) {
        currentOptions.current = action;
        const options = [];

        Object.entries(FileSize).forEach(([key, value]) => {
          let descr = '';
          if (value > 0) {
            if (value < 1000000) {
              descr = value / 1000 + 'KB';
            } else if (value < 1000000000) {
              descr = value / 1000000 + 'MB';
            } else if (value === 1000000000) {
              descr = value / 1000000000 + 'G';
            } else {
              descr = 'over 1GB';
            }
          }
          options.push({
            id: key,
            action: ExecActions.SIZE_SEARCH,
            label: i18n.t('core:' + key),
            descr: descr,
            filter
          });
        });
        searchOptions.current = options;
        optionsChanged = true;
      }
    } else if (isAction(action, SearchQueryComposition.LAST_MODIFIED)) {
      if (
        currentOptions.current !==
        SearchQueryComposition.LAST_MODIFIED.shortName
      ) {
        currentOptions.current = action;
        const options = [];

        Object.entries(LastModified).forEach(([key, value]) => {
          options.push({
            id: key,
            action: ExecActions.LAST_MODIFIED_SEARCH,
            label: i18n.t('core:' + key),
            filter
          });
        });
        searchOptions.current = options;
        optionsChanged = true;
      }
    } else if (isAction(action, SearchQueryComposition.SCOPE)) {
      if (currentOptions.current !== SearchQueryComposition.SCOPE.shortName) {
        currentOptions.current = action;
        const options = [];

        Object.entries(scope).forEach(([key, value]) => {
          options.push({
            id: key,
            action: ExecActions.SCOPE_SEARCH,
            label: i18n.t('core:' + key),
            filter
          });
        });
        searchOptions.current = options;
        optionsChanged = true;
      }
    } else if (isAction(action, SearchQueryComposition.ACCURACY)) {
      if (
        currentOptions.current !== SearchQueryComposition.ACCURACY.shortName
      ) {
        currentOptions.current = action;
        const options = [];

        Object.entries(accuracy).forEach(([key, value]) => {
          options.push({
            id: key,
            action: ExecActions.ACCURACY_SEARCH,
            label: i18n.t('core:' + key),
            filter
          });
        });
        searchOptions.current = options;
        optionsChanged = true;
      }
    } else {
      currentOptions.current = action;
      const execActionsArr = Object.values(ExecActions);
      if (execActionsArr.includes(action)) {
        searchOptions.current = getSearchOptions().filter(
          option => option.group === 'query'
        );
        optionsChanged = true;
      } else {
        searchOptions.current = getSearchOptions();
      }
    }

    if (optionsChanged) {
      isOpen.current = true;
      forceUpdate();
    }
  }

  function execActions(
    options: Array<any>,
    previousActions = [],
    hasOptionsChanged = false,
    unique = false
  ) {
    const actions: Array<SearchOptionType> = [];

    function setActionLabel(key: ActionType, option: SearchOptionType): string {
      if (actions.length > 0) {
        const action = actions.find(a => a.action === key.fullName); //[actions.length - 1];
        if (isAction(action.action, key)) {
          action.label = action.action + option.label;
          action.fullName = action.action + option.label;
          return option.id;
        }
      }
      return undefined;
    }

    for (let i = 0; i < options.length; i++) {
      let option: SearchOptionType;
      if (typeof options[i] === 'object') {
        option = { ...options[i] };
      } else {
        const action = findAction(options[i]);
        option = {
          label: options[i],
          fullName: action,
          action: action
        };
      }
      const prevAction = previousActions.find(
        obj =>
          obj.action === option.action &&
          (unique ||
            obj.label === option.label ||
            (obj.fullName && obj.fullName === option.fullName))
      );
      if (!prevAction) {
        if (isAction(option.action, SearchActions.LOCATION)) {
          if (hasOptionsChanged) {
            changeOptions(option.action);
          }
          actions.push(option);
        } else if (option.action === ExecActions.OPEN_LOCATION) {
          dispatch(AppActions.exitSearchMode());
          // isOpen.current = false;
          searchOptions.current = getSearchOptions();
          currentOptions.current = undefined;
          openLocationByIdDispatch(option.id);
          return [];
        } else if (isAction(option.action, SearchActions.FILTER)) {
          actions.push(option);
          isOpen.current = false;
        } else if (isAction(option.action, SearchActions.HISTORY)) {
          if (hasOptionsChanged) {
            changeOptions(option.action);
            isOpen.current = true;
          }
          actions.push(option);
        } else if (isAction(option.action, SearchActions.BOOK)) {
          if (hasOptionsChanged) {
            changeOptions(option.action);
            isOpen.current = true;
          }
          actions.push(option);
        } else if (isAction(option.action, SearchActions.SEARCH)) {
          if (hasOptionsChanged) {
            changeOptions(option.action);
            isOpen.current = true;
          }
          actions.push(option);
        } else if (isAction(option.action, SearchActions.SEARCH_HISTORY)) {
          if (hasOptionsChanged) {
            changeOptions(option.action);
            isOpen.current = true;
          }
          actions.push(option);
        } else if (option.action === ExecActions.OPEN_HISTORY) {
          if (option.searchQuery) {
            if (option.id) {
              dispatch(AppActions.switchLocationTypeByID(option.id)).then(
                () => {
                  dispatch(AppActions.changeLocationByID(option.id));
                  dispatch(
                    LocationIndexActions.setSearchQuery(option.searchQuery)
                  );
                }
              );
            } else {
            }
          } else if (Pro && Pro.history) {
            const item: TS.HistoryItem = {
              path: option.label,
              url: option.fullName,
              lid: option.id,
              creationTimeStamp: 0
            };
            Pro.history.openItem(
              item,
              currentLocation.uuid,
              openLinkDispatch,
              openLocationByIdDispatch,
              openEntryDispatch
            );
          }
          searchOptions.current = getSearchOptions();
          currentOptions.current = undefined;
          isOpen.current = false;
          return [];
        } else if (option.action === ExecActions.OPEN_BOOKMARK) {
          if (Pro && Pro.history) {
            const item: TS.HistoryItem = {
              path: option.label,
              url: option.fullName,
              lid: undefined,
              creationTimeStamp: 0
            };
            Pro.history.openItem(
              item,
              currentLocation.uuid,
              openLinkDispatch,
              openLocationByIdDispatch,
              openEntryDispatch
            );
          }
          searchOptions.current = getSearchOptions();
          currentOptions.current = undefined;
          isOpen.current = false;
          return [];
        } else if (option.action === ExecActions.OPEN_SAVED_SEARCHES) {
          dispatch(
            LocationIndexActions.setSearchQuery(JSON.parse(option.fullName))
          );
          searchOptions.current = getSearchOptions();
          currentOptions.current = undefined;
          isOpen.current = false;
          return [];
        } else if (
          isAction(option.action, SearchQueryComposition.TAG_AND) ||
          isAction(option.action, SearchQueryComposition.TAG_OR) ||
          isAction(option.action, SearchQueryComposition.TAG_NOT)
        ) {
          if (hasOptionsChanged) {
            changeOptions(option.action);
          }
          actions.push(option);
        } else if (
          option.action === ExecActions.TAG_SEARCH_AND ||
          option.action === ExecActions.TAG_SEARCH_OR ||
          option.action === ExecActions.TAG_SEARCH_NOT
        ) {
          if (actions.length > 0) {
            const searchAction: string =
              option.action === ExecActions.TAG_SEARCH_AND
                ? SearchQueryComposition.TAG_AND.shortName
                : option.action === ExecActions.TAG_SEARCH_NOT
                ? SearchQueryComposition.TAG_NOT.shortName
                : SearchQueryComposition.TAG_OR.shortName;

            let prevAction;
            if (unique) {
              prevAction = actions.find(a => a.action === searchAction);
            }
            if (!prevAction) {
              prevAction = actions[actions.length - 1];
            }
            prevAction.label = searchAction + option.label;
            prevAction.fullName = searchAction + option.label;
            prevAction.color = option.color;
            prevAction.textcolor = option.textcolor;
          }
          const tagsAND = getTags(
            actionValues.current,
            SearchQueryComposition.TAG_AND
          );
          const tagsOR = getTags(
            actionValues.current,
            SearchQueryComposition.TAG_OR
          );
          const tagsNOT = getTags(
            actionValues.current,
            SearchQueryComposition.TAG_NOT
          );
          dispatch(
            LocationIndexActions.setSearchQuery({
              ...searchQuery,
              tagsAND,
              tagsOR,
              tagsNOT,
              executeSearch: false
            })
          );
          setTextQuery('');
          if (hasOptionsChanged) {
            changeOptions(option.action);
          }
        } else if (isAction(option.action, SearchQueryComposition.TYPE)) {
          if (hasOptionsChanged) {
            changeOptions(option.action);
          }
          actions.push(option);
        } else if (option.action === ExecActions.TYPE_SEARCH) {
          const id = setActionLabel(SearchQueryComposition.TYPE, option);
          if (id) {
            fileTypes.current = option.descr.split(', ');
            dispatch(
              LocationIndexActions.setSearchQuery({
                ...searchQuery,
                fileTypes: fileTypes.current,
                executeSearch: false
              })
            );
          }
          if (hasOptionsChanged) {
            changeOptions(option.action);
          }
          // executeSearch();
        } else if (isAction(option.action, SearchQueryComposition.SIZE)) {
          if (hasOptionsChanged) {
            changeOptions(option.action);
          }
          actions.push(option);
        } else if (option.action === ExecActions.SIZE_SEARCH) {
          const id = setActionLabel(SearchQueryComposition.SIZE, option);
          if (id) {
            fileSize.current = id;
            dispatch(
              LocationIndexActions.setSearchQuery({
                ...searchQuery,
                fileSize: id,
                executeSearch: false
              })
            );
          }
          if (hasOptionsChanged) {
            changeOptions(option.action);
          }
          // executeSearch();
        } else if (
          isAction(option.action, SearchQueryComposition.LAST_MODIFIED)
        ) {
          if (hasOptionsChanged) {
            changeOptions(option.action);
          }
          actions.push(option);
        } else if (option.action === ExecActions.LAST_MODIFIED_SEARCH) {
          const id = setActionLabel(
            SearchQueryComposition.LAST_MODIFIED,
            option
          );
          if (id) {
            lastModified.current = id;
            dispatch(
              LocationIndexActions.setSearchQuery({
                ...searchQuery,
                lastModified: id,
                executeSearch: false
              })
            );
          }
          if (hasOptionsChanged) {
            changeOptions(option.action);
          }
          // executeSearch();
        } else if (isAction(option.action, SearchQueryComposition.SCOPE)) {
          if (hasOptionsChanged) {
            changeOptions(option.action);
          }
          actions.push(option);
        } else if (option.action === ExecActions.SCOPE_SEARCH) {
          const id = setActionLabel(SearchQueryComposition.SCOPE, option);
          if (id) {
            setSearchBoxing(scope[id]);
            dispatch(
              LocationIndexActions.setSearchQuery({
                ...searchQuery,
                searchBoxing: scope[id],
                executeSearch: false
              })
            );
          }
          if (hasOptionsChanged) {
            changeOptions(option.action);
          }
        } else if (isAction(option.action, SearchQueryComposition.ACCURACY)) {
          if (hasOptionsChanged) {
            changeOptions(option.action);
          }
          actions.push(option);
        } else if (option.action === ExecActions.ACCURACY_SEARCH) {
          const id = setActionLabel(SearchQueryComposition.ACCURACY, option);
          if (id) {
            searchType.current = accuracy[id];
            dispatch(
              LocationIndexActions.setSearchQuery({
                ...searchQuery,
                searchType: accuracy[id],
                executeSearch: false
              })
            );
          }
          if (hasOptionsChanged) {
            changeOptions(option.action);
          }
          // executeSearch();
        } else if (option.action === undefined) {
          // text query
          setTextQuery(option.label);

          const pAction = actions[actions.length - 1];
          if (pAction && isAction(pAction.action, SearchActions.FILTER)) {
            const filterArr = options.filter(
              o => !(typeof o === 'object') && o.action === undefined
            );
            if (filterArr.length > 0) {
              dispatch(AppActions.setSearchFilter(filterArr.join(' ')));
              isOpen.current = false;
              return actions;
            }
          }
        }
      } else {
        actions.push(prevAction);
      }
    }
    // setTextQuery(actions);
    return actions;
  }

  function handleInputChange(event: any, value: string, reason: string) {
    // handleChange(event, value.split(' '), 'createOption');
    if (reason === 'input') {
      const valueArr = value.split(' ');
      actionValues.current = execActions(
        [...actionValues.current, ...valueArr],
        actionValues.current,
        true
      );
      const inputArr = valueArr.filter(
        action => !actionValues.current.some(v => v.label === action)
      );
      setTextQuery(inputArr.join(' '));
      //textQuery.current += ' ' + inputValue.current;
      forceUpdate();
    } else if (reason === 'clear') {
      clearSearch();
    } else if (reason === 'reset') {
      /*if (event.type === 'keydown' || event.type === 'click') {
        // textQuery.current += ' ' + inputValue.current;
        props.setTextQuery('');
      } else if (event.type === 'blur') {
      }*/
      // executeSearch();
    }
  }

  function toExecAction(action: string) {
    if (isAction(action, SearchQueryComposition.TAG_AND)) {
      return ExecActions.TAG_SEARCH_AND;
    }
    if (isAction(action, SearchQueryComposition.TAG_NOT)) {
      return ExecActions.TAG_SEARCH_NOT;
    }
    if (isAction(action, SearchQueryComposition.TAG_OR)) {
      return ExecActions.TAG_SEARCH_OR;
    }
    return action;
  }

  function handleChange(event: Object, selected: Array<any>, reason: string) {
    if (reason === 'selectOption') {
      actionValues.current = execActions(selected, actionValues.current, true);
      forceUpdate();
    } else if (reason === 'createOption') {
      const actions = [];
      let prevOption;
      for (let i = 0; i < selected.length; i++) {
        const option = selected[i];
        if (option.action === undefined && prevOption) {
          let action = findAction(prevOption, true);
          if (action) {
            actions.push({
              label: option,
              action: toExecAction(action)
            });
          } else {
            actions.push(option);
          }
        } else {
          actions.push(option);
        }
        prevOption = option;
      }
      actionValues.current = execActions(actions, actionValues.current, true);
      forceUpdate();
    } else if (reason === 'remove-value') {
      actionValues.current = actionValues.current.filter(
        v => !(selected.includes(v.label) || selected.includes(v.fullName))
      );
      resetActions(actionValues.current);
      forceUpdate();
      // reset default search filters
      /*for (let i = 0; i < selected.length; i++) {
        const action = findAction(selected[i]);
        if (isAction(action, SearchQueryComposition.TYPE)) {
          fileTypes.current = [];
        } else if (isAction(action, SearchQueryComposition.SIZE)) {
          fileSize.current = '';
        }
      }

      if (actionValues.current.length === 0) {
        searchOptions.current = SearchOptions;
        currentOptions.current = undefined;
        // textQuery.current = ''; todo remove tagsAnd from search query
      } else {
        const prevAction =
          actionValues.current[actionValues.current.length - 1];
        changeOptions(toExecAction(prevAction.action));
        // textQuery.current = actionValues.current.map(v => v.label).join(' ');
      }
      // executeSearch();
      isOpen.current = true;*/
    } /*else if (reason === 'clear') {
      props.setSearchQuery({});
    }*/
  }

  function resetActions(actions: Array<SearchOptionType>) {
    resetValues(actions);
    if (actions.length === 0) {
      searchOptions.current = getSearchOptions();
      currentOptions.current = undefined;
      // textQuery.current = ''; todo remove tagsAnd from search query
    } else {
      actionValues.current = execActions(actions, [], false);
      searchOptions.current = getSearchOptions().filter(
        option => option.group === 'query'
      );
      currentOptions.current = undefined;
    }
  }

  /*const handleOpen = React.useCallback(() => {
    isOpen.current = true;
  }, []);

  const handleClose = React.useCallback(() => {
    isOpen.current = false;
  }, []);*/

  if (!open) {
    return null;
  }

  // const startAdornment = (
  //   <IconButton size="small" edge="end" onClick={clickSearchButton}>
  //     <SearchIcon />
  //   </IconButton>
  // );

  /*const startAdornment = isDesktop ? (
    <>
      <Tooltip
        classes={{ tooltip: classes.customWidth }}
        title={
          <span style={{ fontSize: 14 }}>
            {i18n.t('searchScope')}:
            <br />
            &bull; {i18n.t('location')} - {i18n.t('searchPlaceholder')}
            <br />
            &bull; {i18n.t('folder')} -{' '}
            {i18n.t('searchCurrentFolderWithSubFolders')}
            <br />
            &bull; {i18n.t('globalSearch')} -{' '}
            {i18n.t('searchInAllLocationTooltip')} ({i18n.t('betaStatus')})
            <br />
          </span>
        }
      >
        <Typography
          variant="overline"
          display="block"
          onClick={toggleSearchBoxing}
          style={{
            border: '1px solid gray',
            borderRadius: 5,
            lineHeight: 'inherit',
            paddingLeft: 3,
            paddingRight: 3
          }}
        >
          {searchBoxingName}
        </Typography>
      </Tooltip>
      <HelpTooltip classes={classes} />
    </>
  ) : (
    <HelpTooltip classes={classes} />
  );*/

  const endAdornment = (
    <>
      <Tooltip title={i18n.t('core:advancedSearch')}>
        <IconButton
          id="advancedButton"
          data-tid="advancedSearch"
          style={{ maxHeight: 35 }}
          onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
            setAnchorSearch(event.currentTarget);
          }}
        >
          <AdvancedSearchIcon />
          <DropDownIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title={i18n.t('clearSearch') + ' (ESC)'}>
        <IconButton
          id="clearSearchID"
          onClick={() => {
            clearSearch();
          }}
          size="small"
          edge="end"
        >
          <ClearSearchIcon />
        </IconButton>
      </Tooltip>
    </>
  );

  function haveEmptyAction(): boolean {
    if (actionValues.current.length > 0) {
      const action =
        actionValues.current[actionValues.current.length - 1].label;
      return !!findAction(action, true);
    }
    return false;
  }

  return (
    <>
      <div
        id="searchAutocompleteComp"
        style={{
          width: '100%',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <style>
          {`
          #searchAutocompleteComp .MuiAutocomplete-root .MuiInputBase-root {
            padding: 0 5px 0 5px !important;
          }
          .MuiAutocomplete-popper {
            min-width: 350px;
          }
        `}
        </style>
        <Autocomplete
          id="textQuery"
          multiple
          /*autoFocus*/
          /*openOnFocus*/
          freeSolo
          autoSelect
          autoComplete
          handleHomeEndKeys
          /*defaultValue={['one']}*/
          value={actionValues.current.map(v =>
            v.fullName ? v.fullName : v.label
          )}
          onChange={handleChange}
          inputValue={textQuery}
          onInputChange={handleInputChange}
          open={isOpen.current}
          /*onOpen={handleOpen}
          onClose={handleClose}*/
          filterOptions={(options: Array<SearchOptionType>, state: any) => {
            const filteredOptions = options.filter(option => {
              if (option.filter === false) {
                return true;
              }
              return (
                option.label
                  .toLowerCase()
                  .indexOf(state.inputValue.toLowerCase()) > -1
              );
            });
            if (filteredOptions.length === 0 && !haveEmptyAction()) {
              isOpen.current = false;
            }
            return filteredOptions;
          }}
          renderTags={value =>
            value.map((option, index: number) => {
              const action = actionValues.current.find(
                a => a.fullName === option || a.label === option
              );
              return (
                <Box
                  key={'button_' + index}
                  style={{
                    border: '1px solid gray',
                    minHeight: 0,
                    minWidth: 0,
                    margin: 2,
                    paddingTop: 0,
                    paddingBottom: 0,
                    paddingRight: 0,
                    paddingLeft: 5,
                    borderRadius: 5,
                    ...(action &&
                      action.color && {
                        color: action.textcolor,
                        backgroundColor: action.color,
                        border: 'none'
                      })
                  }}
                >
                  {isAction(action.action, SearchQueryComposition.TAG_AND) ||
                  isAction(action.action, SearchQueryComposition.TAG_OR) ||
                  isAction(action.action, SearchQueryComposition.TAG_NOT) ? (
                    <Box
                      style={{
                        fontSize: 13,
                        fontWeight: 'bold',
                        display: 'inline'
                      }}
                    >
                      {option}
                    </Box>
                  ) : (
                    <Button
                      onClick={() => {
                        changeOptions(action.action, false);
                      }}
                      data-tid={dataTidFormat('menu' + option)}
                      size="small"
                      style={{
                        backgroundColor: 'transparent',
                        padding: 0
                      }}
                      endIcon={<ArrowDropDownIcon />}
                    >
                      {option}
                    </Button>
                  )}

                  {!isAction(action.action, SearchQueryComposition.SCOPE) &&
                    !isAction(
                      action.action,
                      SearchQueryComposition.ACCURACY
                    ) && (
                      <IconButton
                        onClick={() => {
                          handleChange(null, [option], 'remove-value');
                        }}
                        style={{ padding: 0, margin: 0 }}
                        data-tid={dataTidFormat('close' + option)}
                        size="small"
                      >
                        <CloseIcon />
                      </IconButton>
                    )}
                </Box>
              );
            })
          }
          /*inputValue={inputValue}
          onInputChange={(event, newInputValue) => {
            setInputValue(newInputValue);
          }}*/
          options={searchOptions.current}
          groupBy={option => option.group}
          renderGroup={params => (
            <li key={params.key}>
              <div
                style={{
                  position: 'sticky',
                  top: '-8px',
                  padding: '4px 10px',
                  backgroundColor: theme.palette.background.default
                }}
              >
                {i18n.t(params.group)}
              </div>
              <ul style={{ padding: 0 }}>{params.children}</ul>
            </li>
          )}
          renderOption={(props, option) => (
            <Box component="li" {...props}>
              {option.color ? (
                <Button
                  size="small"
                  style={{
                    fontSize: 13,
                    textTransform: 'none',
                    color: option.textcolor,
                    backgroundColor: option.color,
                    minHeight: 0,
                    minWidth: 0,
                    margin: 2,
                    paddingTop: 0,
                    paddingBottom: 0,
                    paddingRight: 5,
                    paddingLeft: 5,
                    borderRadius: 5
                  }}
                >
                  {option.label}
                </Button>
              ) : (
                <>
                  <b>{option.label}</b>
                  &nbsp;{option.descr}
                </>
              )}
            </Box>
          )}
          /*getOptionLabel={(option: SearchOptionType) =>
            option.label + ': ' + option.descr
          }*/
          sx={{ width: 'calc(100% - 80px)' }}
          onKeyDown={onKeyDownHandler}
          disableClearable={true}
          renderInput={params => {
            if (params.InputProps.endAdornment) {
              params.InputProps.endAdornment = [
                params.InputProps.endAdornment,
                endAdornment
              ];
            } else {
              params.InputProps.endAdornment = [endAdornment];
            }
            return (
              <TextField
                {...params}
                /*style={{ padding: 3, borderRadius: 7 }}*/
                onBlur={() => {
                  isOpen.current = false;
                  forceUpdate();
                }}
                onFocus={() => {
                  isOpen.current = true;
                  forceUpdate();
                }}
                fullWidth
                /*id="textQuery"
              name="textQuery"*/
                // label={i18n.t('core:searchTitle')}
                /*defaultValue={textQuery.current}*/
                /*onChange={event => {
                textQuery.current = event.target.value;
              }}*/
                /*style={{
        width: 'calc(100% - 80px)'
      }}*/
                /*inputRef={mainSearchField}*/
                autoFocus
                /*onKeyDown={startSearch}*/
                placeholder={i18n.t('core:searchTitle')}
                size="small"
                margin="dense"
                variant="outlined"
              />
            );
          }}
        />
        <Tooltip title={indexing ? i18n.t('searchDisabledWhileIndexing') : ''}>
          <Button
            id="searchButton"
            variant="outlined"
            size="small"
            disabled={indexing}
            style={{
              marginRight: 10,
              marginLeft: 10,
              marginTop: 3
            }}
            color="primary"
            onClick={clickSearchButton}
          >
            {i18n.t('searchTitle')}
          </Button>
        </Tooltip>
      </div>
      <SavedSearchesMenu
        anchorEl={openSavedSearches}
        open={Boolean(openSavedSearches)}
        onClose={() => setOpenSavedSearches(null)}
      />
    </>
  );
}

export default SearchAutocomplete;
