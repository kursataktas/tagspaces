/*
 * Copyright (c) 2016-present - TagSpaces UG (Haftungsbeschraenkt). All rights reserved.
 */
import { test, expect } from './fixtures';
import AppConfig from '../../src/renderer/AppConfig';
import {
  defaultLocationPath,
  defaultLocationName,
  createPwMinioLocation,
  createPwLocation,
  createS3Location,
} from './location.helpers';
import {
  createNewDirectory,
  newHTMLFile,
  newMDFile,
  closeOpenedFile,
  deleteDirectory,
  clickOn,
  expectElementExist,
  selectorFile,
  createTxtFile,
  expectMetaFilesExist,
  getGridFileSelector,
  isDisplayed,
  openFolder,
} from './general.helpers';
import { startTestingApp, stopApp, testDataRefresh } from './hook';
import { clearDataStorage, closeWelcomePlaywright } from './welcome.helpers';
import { openContextEntryMenu } from './test-utils';
import { stopServices } from '../setup-functions';

export const firstFile = '/span';
export const perspectiveGridTable = '//*[@data-tid="perspectiveGridFileTable"]';
const subFolderName = '/test-perspective-grid';
const subFolderContentExtractionPath =
  defaultLocationPath + '/content-extraction';
const subFolderThumbnailsPath = defaultLocationPath + '/thumbnails';
const testFolder = 'testFolder';

let s3ServerInstance;
let webServerInstance;
let minioServerInstance;

test.beforeAll(async ({ s3Server, webServer, minioServer }) => {
  s3ServerInstance = s3Server;
  webServerInstance = webServer;
  minioServerInstance = minioServer;
  if (global.isS3) {
    await startTestingApp();
    await closeWelcomePlaywright();
  } else {
    await startTestingApp('extconfig.js');
  }
});

test.afterAll(async () => {
  await stopServices(s3ServerInstance, webServerInstance, minioServerInstance);
  //await testDataRefresh(s3ServerInstance);
  await stopApp();
});

test.afterEach(async ({ page }, testInfo) => {
  /*if (testInfo.status !== testInfo.expectedStatus) {
    await takeScreenshot(testInfo);
  }*/
  await clearDataStorage();
});

test.beforeEach(async () => {
  if (global.isMinio) {
    await closeWelcomePlaywright();
    await createPwMinioLocation('', defaultLocationName, true);
  } else if (global.isS3) {
    await closeWelcomePlaywright();
    await createS3Location('', defaultLocationName, true);
  } else {
    await createPwLocation(defaultLocationPath, defaultLocationName, true);
  }
  await clickOn('[data-tid=location_' + defaultLocationName + ']');
  await expectElementExist(getGridFileSelector('empty_folder'), true, 8000);
  // If its have opened file
  // await closeFileProperties();
});

test.describe('TST51 - Perspective Grid', () => {
  test('TST0501 - Create HTML file [web,electron,minio]', async () => {
    // await global.client.waitForLoadState('networkidle');
    await createNewDirectory();
    await expectElementExist(
      '[data-tid=fsEntryName_' + testFolder + ']',
      true,
      4000,
    );
    await openFolder(testFolder);
    // create new file
    await newHTMLFile();
    await closeOpenedFile();
    // await reloadDirectory();
    await expectElementExist(selectorFile, true);

    // delete directory
    await deleteDirectory(testFolder);

    await expectElementExist(
      '[data-tid=fsEntryName_' + testFolder + ']',
      false,
      2000,
    );
    // await takeScreenshot('TST0501 after deleteDirectory');
  });

  test('TST0502 - Create MD file [web,electron,minio]', async () => {
    await createNewDirectory();
    await expectElementExist(
      '[data-tid=fsEntryName_' + testFolder + ']',
      true,
      2000,
    );
    await global.client.dblclick('[data-tid=fsEntryName_' + testFolder + ']');

    // create new file
    await newMDFile();
    await closeOpenedFile();
    // await reloadDirectory();
    await expectElementExist(selectorFile, true);

    // await deleteFirstFile();
    await deleteDirectory(testFolder);
    await expectElementExist(
      '[data-tid=fsEntryName_' + testFolder + ']',
      false,
      2000,
    );
    // await takeScreenshot('TST0502 after deleteDirectory');
  });

  test('TST0503 - Create TEXT file [web,electron,minio]', async () => {
    await createNewDirectory();
    await expectElementExist(
      '[data-tid=fsEntryName_' + testFolder + ']',
      true,
      2000,
    );
    await global.client.dblclick('[data-tid=fsEntryName_' + testFolder + ']');

    // create new file
    await createTxtFile();
    await closeOpenedFile();
    // await reloadDirectory();
    await expectElementExist(selectorFile, true);

    // await deleteFirstFile();
    await deleteDirectory(testFolder);
    await expectElementExist(
      '[data-tid=fsEntryName_' + testFolder + ']',
      false,
      2000,
    );
    // await takeScreenshot('TST0503 after deleteDirectory');
  });

  test('TST0510 - Generate thumbnail from Images [electron,minio]', async () => {
    const filtered = ['ico', 'tiff', 'tif'];
    if (global.isMinio || global.isS3) {
      filtered.push('svg');
    }
    const metaFiles = AppConfig.ThumbGenSupportedFileTypes.image
      .filter((ext) => !filtered.includes(ext)) // ico file thumbnail generation not work TODO in not PRO version tiff tif is not generated in tests environment only
      .map((imgExt) => 'sample.' + imgExt + '.jpg');

    await expectMetaFilesExist(metaFiles);
  });

  test('TST0510a - Generate thumbnail from JPG w. rotation from EXIF [web,minio,electron]', async () => {
    await clickOn(getGridFileSelector('sample_exif[iptc].jpg'));

    const iframeElement = await global.client.waitForSelector('iframe');
    const frame = await iframeElement.contentFrame();

    await frame.click('#extFabMenu');
    await frame.click('#exifButton');

    let latExists = await isDisplayed(
      '#exifTableBody tr:has(th:has-text("GPSLatitude")) td',
      true,
      5000,
      frame,
    );
    expect(latExists).toBeTruthy();
  });

  test('TST0511 - Generate thumbnail from Videos [electron]', async () => {
    if (global.isWin) {
      // todo in github thumbnails not generated for videos on MacOS
      const metaFiles = AppConfig.ThumbGenSupportedFileTypes.video.map(
        (imgExt) => 'sample.' + imgExt + '.jpg',
      );
      await expectMetaFilesExist(metaFiles);
    }
  });

  test('TST0516 - Generate thumbnail from PDF [electron]', async () => {
    await expectMetaFilesExist(['sample.pdf.jpg']);
  });

  test('TST0517 - Generate thumbnail from ODT [electron,_pro]', async () => {
    await expectMetaFilesExist([
      'sample.odt.jpg',
      'sample.ods.jpg',
      'sample.epub.jpg',
    ]);
  });

  test('TST0519 - Generate thumbnail from TIFF [electron,_pro]', async () => {
    await expectMetaFilesExist(['sample.tiff.jpg']);
  });

  test.skip('TST0520 - Generate thumbnail from PSD [electron,minio,_pro]', async () => {
    // TODO fix
    await expectMetaFilesExist(['sample.psd.jpg']);
  });

  test('TST0522 - Generate thumbnail from URL [electron,minio,_pro]', async () => {
    await expectMetaFilesExist(['sample.url.jpg']);
  });

  test('TST0523 - Generate thumbnail from HTML [electron,minio,_pro]', async () => {
    await expectMetaFilesExist(['sample.html.jpg']);
  });

  test('TST0524 - Generate thumbnail from TXT,MD [electron,minio,_pro]', async () => {
    // MD thumbs generation is stopped
    await expectMetaFilesExist(['sample.txt.jpg']);
  });

  test('TST0529 - Import EXIF information as Tags [web,minio,electron,_pro]', async () => {
    await openContextEntryMenu(
      getGridFileSelector('sample_exif[iptc].jpg'),
      'showPropertiesTID',
    );

    await clickOn('[data-tid=openGalleryPerspective]');
    await expectElementExist(
      '[data-tid=perspectiveGalleryToolbar]',
      true,
      5000,
    );
    await clickOn('[data-tid=perspectiveGalleryImportEXIF]');
    await global.client.check('input[value=exifGeo]');
    await clickOn('[data-tid=confirmImportExif]');

    await expectElementExist(
      '[data-tid="tagContainer_8FWH4HVG+3V"]',
      true,
      5000,
    );
  });
});
