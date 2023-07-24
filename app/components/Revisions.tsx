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
import {
  getBackupFileLocation,
  extractContainingDirectoryPath
} from '@tagspaces/tagspaces-common/paths';
import Tooltip from '-/components/Tooltip';
import {
  actions as AppActions,
  AppDispatch,
  getOpenedFiles,
  OpenedEntry
} from '-/reducers/app';
import { useSelector, useDispatch } from 'react-redux';
import { getCurrentLanguage } from '-/reducers/settings';
import PlatformIO from '-/services/platform-facade';
import { TS } from '-/tagspaces.namespace';
import { format, formatDistanceToNow } from 'date-fns';
import i18n from '-/services/i18n';
import DeleteIcon from '@mui/icons-material/Delete';
import PreviewIcon from '@mui/icons-material/Preview';
import RestoreIcon from '@mui/icons-material/Restore';
import IconButton from '@mui/material/IconButton';
import AppConfig from '-/AppConfig';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow
} from '@mui/material';
import { Pro } from '-/pro';
import FilePreviewDialog from '-/components/dialogs/FilePreviewDialog';

const initialRowsPerPage = 10;

function Revisions() {
  const dispatch: AppDispatch = useDispatch();
  const language = useSelector(getCurrentLanguage);
  const openedFiles: Array<OpenedEntry> = useSelector(getOpenedFiles);
  const [rows, setRows] = useState<Array<TS.FileSystemEntry>>([]);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = React.useState<number>(
    initialRowsPerPage
  );
  const [previewDialogEntry, setPreviewDialogEntry] = useState<
    TS.FileSystemEntry | undefined
  >(undefined);
  // const [ignored, forceUpdate] = useReducer(x => x + 1, 0);

  useEffect(() => {
    // if no history item path - not loadHistoryItems for items in metaFolder
    const openedFile = openedFiles[0];
    if (openedFile && openedFile.path.indexOf(AppConfig.metaFolder) === -1) {
      loadHistoryItems(openedFile);
    }
  }, [openedFiles]);

  function loadHistoryItems(openedFile: OpenedEntry) {
    Pro.MetaOperations.getMetadataID(openedFile.path, openedFile.uuid).then(
      id => {
        openedFile.uuid = id;
        const backupFilePath = getBackupFileLocation(
          openedFile.path,
          openedFile.uuid,
          PlatformIO.getDirSeparator()
        );
        const backupPath = extractContainingDirectoryPath(
          backupFilePath,
          PlatformIO.getDirSeparator()
        );
        PlatformIO.listDirectoryPromise(backupPath, []).then(h =>
          setRows(h.sort((a, b) => (a.lmdt < b.lmdt ? 1 : -1)))
        );
      }
    );
  }

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  function deleteRevision(path) {
    PlatformIO.deleteFilePromise(path, true).then(() =>
      loadHistoryItems(openedFiles[0])
    );
  }

  function deleteRevisions() {
    if (rows.length > 0) {
      const promises = rows.map(row =>
        PlatformIO.deleteFilePromise(row.path, true)
      );
      Promise.all(promises).then(() => loadHistoryItems(openedFiles[0]));
    }
  }

  function restoreRevision(revisionPath) {
    const openedFile = openedFiles[0];
    const targetPath = getBackupFileLocation(
      openedFile.path,
      openedFile.uuid,
      PlatformIO.getDirSeparator()
    );
    return PlatformIO.copyFilePromiseOverwrite(
      openedFile.path,
      targetPath
    ).then(() =>
      PlatformIO.copyFilePromiseOverwrite(revisionPath, openedFile.path).then(
        () =>
          dispatch(
            AppActions.updateOpenedFile(openedFile.path, {
              ...openedFile,
              editMode: false,
              shouldReload: !openedFile.shouldReload
            })
          )
      )
    );
  }
  function titleFormat(lmdt) {
    return lmdt ? format(lmdt, 'dd.MM.yyyy HH:mm:ss') : '';
  }

  function cellFormat(lmdt) {
    return lmdt
      ? formatDistanceToNow(lmdt, {
          includeSeconds: true,
          addSuffix: true
          // locale: https://date-fns.org/v2.29.3/docs/formatDistanceToNow#usage
        })
      : '';
  }

  const paginatedRows = React.useMemo(
    () => rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [rows, page, rowsPerPage]
  );

  return (
    <Paper
      sx={{ width: '100%', overflow: 'hidden', height: 'calc(100% - 30px)' }}
    >
      {rows.length > initialRowsPerPage && (
        <TablePagination
          rowsPerPageOptions={[10, 25]}
          component="div"
          count={rows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      )}
      <TableContainer
        component={Paper}
        sx={{
          maxHeight: '100%',
          overflowY: 'auto'
        }}
      >
        <Table
          data-tid="tableRevisionsTID"
          sx={{ width: '100%', height: '100%' }}
          stickyHeader
          size="small"
          aria-label="revisions table"
        >
          <TableHead>
            <TableRow>
              <TableCell>
                {i18n.t('revisions')}
                <Tooltip title={i18n.t('core:deleteAllRevisions')}>
                  <IconButton
                    aria-label="delete all revisions"
                    onClick={() =>
                      confirm(
                        'The all revisions will be deleted. Do you want to continue?'
                      ) && deleteRevisions()
                    }
                    data-tid="deleteRevisionsTID"
                    size="large"
                  >
                    <DeleteIcon color="primary" />
                  </IconButton>
                </Tooltip>
              </TableCell>
              <TableCell align="right">{i18n.t('created')}</TableCell>
              <TableCell align="right">{i18n.t('actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRows.map(row => (
              <TableRow
                data-tid={openedFiles[0].uuid}
                key={row.path}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell
                  component="th"
                  scope="row"
                  onClick={() => setPreviewDialogEntry(row)}
                >
                  {row.name}
                </TableCell>
                <TableCell align="right" title={titleFormat(row.lmdt)}>
                  {cellFormat(row.lmdt)}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={i18n.t('core:view')}>
                    <IconButton
                      aria-label="view revision"
                      onClick={() => setPreviewDialogEntry(row)}
                      data-tid="viewRevisionTID"
                      size="large"
                    >
                      <PreviewIcon color="primary" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={i18n.t('core:restore')}>
                    <IconButton
                      aria-label="restore revision"
                      onClick={() => restoreRevision(row.path)}
                      data-tid="restoreRevisionTID"
                      size="large"
                    >
                      <RestoreIcon color="primary" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={i18n.t('core:delete')}>
                    <IconButton
                      aria-label="delete revision"
                      onClick={() => deleteRevision(row.path)}
                      data-tid="deleteRevisionTID"
                      size="large"
                    >
                      <DeleteIcon color="primary" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <FilePreviewDialog
        fsEntry={previewDialogEntry}
        open={previewDialogEntry !== undefined}
        onClose={() => setPreviewDialogEntry(undefined)}
      />
    </Paper>
  );
}

export default Revisions;
