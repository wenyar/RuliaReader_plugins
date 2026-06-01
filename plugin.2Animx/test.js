const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');
const https = require('https');
const http = require('http');

const pluginDir = __dirname;
const code = fs.readFileSync(path.join(pluginDir, 'index.js'), 'utf8');

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https:') ? https : http;
    const req = lib.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 20000
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks)
        });
      });
    });
    req.on('timeout', () => {
      req.destroy(new Error('Request timeout: ' + url));
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function callPlugin(name, args) {
  let result;
  let exception;
  const context = {
    URL,
    URLSearchParams,
    fetch,
    btoa,
    Buffer,
    console,
    window: {
      Rulia: {
        async httpRequest(config) {
          const res = await request(config.url, {
            method: config.method || 'GET',
            headers: config.headers || {},
            body: config.body,
            timeout: config.timeout || 20000
          });
          if (res.statusCode < 200 || res.statusCode >= 400) {
            throw new Error('HTTP ' + res.statusCode + ': ' + config.url);
          }
          return res.body.toString('utf8');
        },
        endWithResult(value) {
          result = value;
        },
        endWithException(message) {
          exception = message;
        }
      }
    }
  };
  vm.createContext(context);
  vm.runInContext(code, context, { filename: 'index.js' });
  await context[name].apply(null, args);
  if (exception) {
    throw new Error(exception);
  }
  return result;
}

async function assertFinalImageLoads(value, label) {
  if (/^data:image\//i.test(value)) {
    const bytes = Buffer.from(value.split(',')[1], 'base64');
    assert.ok(bytes.length > 100, label + ' data URL should contain image bytes');
    assert.strictEqual(bytes[0], 0xff, label + ' data URL should start with JPEG SOI');
    assert.strictEqual(bytes[1], 0xd8, label + ' data URL should start with JPEG SOI');
    return;
  }
  const res = await request(value, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  assert.ok(res.statusCode >= 200 && res.statusCode < 400, label + ' should load');
  assert.ok(/^image\//i.test(String(res.headers['content-type'] || '')), label + ' should be image/*');
  assert.ok(res.body.length > 100, label + ' should contain image bytes');
  assert.strictEqual(res.body[0], 0xff, label + ' should start with JPEG SOI');
  assert.strictEqual(res.body[1], 0xd8, label + ' should start with JPEG SOI');
}

(async () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(pluginDir, 'package.json'), 'utf8'));
  assert.strictEqual(pkg.name, '@rulia/2Animx');
  assert.strictEqual(pkg.icon, 'icon.png');
  assert.strictEqual(pkg.cover, 'icon.png');
  assert.ok(fs.existsSync(path.join(pluginDir, 'icon.png')));

  const filters = await callPlugin('setMangaListFilterOptions', []);
  assert.ok(Array.isArray(filters) && filters.length >= 3);

  const list = await callPlugin('getMangaList', [1, 12, '', '']);
  assert.ok(list.list.length > 0, 'default list should not be empty');
  assert.ok(list.list[0].title && list.list[0].url && list.list[0].coverUrl);

  const filtered = await callPlugin('getMangaList', [1, 12, '', JSON.stringify({ category: '5', status: '1', sort: 'uptime' })]);
  assert.ok(Array.isArray(filtered.list), 'filtered list should return an array');

  const search = await callPlugin('getMangaList', [1, 12, '古惑仔', '']);
  assert.ok(search.list.length > 0, 'search should not be empty');
  assert.strictEqual(search.hasNextPage, false, 'search should signal no next page');
  assert.strictEqual(search.totalPage, 1, 'search should signal one page');
  const searchPage2 = await callPlugin('getMangaList', [2, 12, '古惑仔', '']);
  assert.strictEqual(searchPage2.list.length, 0, 'search page 2 should be empty to avoid duplicate results');
  assert.strictEqual(searchPage2.hasNextPage, false, 'search page 2 should signal no next page');

  const coverRes = await request(search.list[0].coverUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  assert.ok(coverRes.statusCode >= 200 && coverRes.statusCode < 400, 'cover should load');
  assert.ok(/^image\//i.test(String(coverRes.headers['content-type'] || '')), 'cover should be image/*');

  const detail = await callPlugin('getMangaData', ['https://www.2animx.com/index-comic-name-古惑仔-id-254']);
  assert.ok(detail.title && detail.coverUrl && detail.description);
  assert.ok(detail.chapterList.length > 0, 'chapter list should not be empty');
  const latestChapter = detail.chapterList.find((item) => /2331/.test(item.title));
  assert.ok(latestChapter, 'latest hash-image chapter should be present');
  assert.ok(/index-look-name-%E5%8F%A4%E6%83%91%E4%BB%94-cid-254-id-\d+/i.test(latestChapter.url), 'chapter URL should use stable manga title form');

  const chapter = await callPlugin('getChapterImageList', ['https://www.2animx.com/index-look-name-古惑仔-cid-254-id-9170']);
  assert.ok(chapter.length > 0, 'chapter images should not be empty');

  const finalImage = await callPlugin('getImageUrl', [chapter[0].url]);
  const imageRes = await request(finalImage, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  assert.ok(imageRes.statusCode >= 200 && imageRes.statusCode < 400, 'final image should load without referer');
  assert.ok(/^image\//i.test(String(imageRes.headers['content-type'] || '')), 'final image should be image/*');

  const finalLastImage = await callPlugin('getImageUrl', [chapter[chapter.length - 1].url]);
  const lastImageRes = await request(finalLastImage, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  assert.ok(lastImageRes.statusCode >= 200 && lastImageRes.statusCode < 400, 'final last image should load without referer');
  assert.ok(/^image\//i.test(String(lastImageRes.headers['content-type'] || '')), 'final last image should be image/*');

  const latestImages = await callPlugin('getChapterImageList', [latestChapter.url]);
  assert.ok(latestImages.length > 0, 'latest hash-image chapter images should not be empty');
  const latestLastImage = await callPlugin('getImageUrl', [latestImages[latestImages.length - 1].url]);
  assert.ok(/^data:image\/jpeg;base64,/i.test(latestLastImage), 'latest hash-image final image should use data URL fallback');
  const latestBytes = Buffer.from(latestLastImage.split(',')[1], 'base64');
  assert.strictEqual(latestBytes[0], 0xff, 'latest hash-image data URL should start with JPEG SOI');
  assert.strictEqual(latestBytes[1], 0xd8, 'latest hash-image data URL should start with JPEG SOI');

  const kimetsu = await callPlugin('getMangaData', ['https://www.2animx.com/index-comic-name-%E9%AC%BC%E6%BB%85%E4%B9%8B%E5%88%83-id-19785']);
  const kimetsuFirst = kimetsu.chapterList[0];
  const kimetsuImages = await callPlugin('getChapterImageList', [kimetsuFirst.url]);
  assert.ok(kimetsuImages.length >= 54, 'kimetsu first chapter should parse all mixed jpg/png pages');
  assert.ok(/\/4\.png$/i.test(kimetsuImages[3].url), 'kimetsu page 4 should use the real png URL from page HTML');
  const brokenKimetsuImages = await callPlugin('getChapterImageList', ['https://www.2animx.com/index-look-name-???????????-cid-19785-id-202105']);
  assert.ok(brokenKimetsuImages.length >= 54, 'kimetsu question-mark route should repair by cid');
  assert.ok(/\/4\.png$/i.test(brokenKimetsuImages[3].url), 'kimetsu repaired page 4 should still use png');
  const kimetsuPage4 = await callPlugin('getImageUrl', [kimetsuImages[3].url]);
  const kimetsuPage4Res = await request(kimetsuPage4, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  assert.ok(kimetsuPage4Res.statusCode >= 200 && kimetsuPage4Res.statusCode < 400, 'kimetsu page 4 should load');
  assert.ok(/^image\//i.test(String(kimetsuPage4Res.headers['content-type'] || '')), 'kimetsu page 4 should be image/*');

  const wasteSearch = await callPlugin('getMangaList', [1, 12, '被稱為廢物的原英雄', '']);
  const wasteItem = wasteSearch.list.find((item) => /被稱為廢物的原英雄/.test(item.title));
  assert.ok(wasteItem && wasteItem.url, 'waste hero search result should exist');
  const wasteDetail = await callPlugin('getMangaData', [wasteItem.url]);
  const wasteFirst = wasteDetail.chapterList[0];
  assert.ok(!/%E3%80%81/.test(wasteFirst.url), 'waste hero chapter URL should use the source route without punctuation');
  const wasteImages = await callPlugin('getChapterImageList', [wasteFirst.url]);
  assert.ok(wasteImages.length >= 30, 'waste hero first chapter should parse images');
  const wasteFirstImage = await callPlugin('getImageUrl', [wasteImages[0].url]);
  await assertFinalImageLoads(wasteFirstImage, 'waste hero first image');
  const staleWasteUrl = 'https://www.2animx.com/index-look-name-%E8%A2%AB%E7%A8%B1%E7%82%BA%E5%BB%A2%E7%89%A9%E7%9A%84%E5%8E%9F%E8%8B%B1%E9%9B%84%E3%80%81%E8%A2%AB%E5%AE%B6%E8%A3%A1%E6%B5%81%E6%94%BE%E5%90%8E%E9%9A%A8%E5%BF%83%E6%89%80%E6%AC%B2%E5%9C%B0%E6%B4%BB%E4%B8%8B%E5%8E%BB-cid-41133-id-532108';
  const staleWasteImages = await callPlugin('getChapterImageList', [staleWasteUrl]);
  assert.ok(staleWasteImages.length >= 30, 'stale waste hero chapter URL should repair itself');
  const mojibakeWasteUrl = 'https://www.2animx.com/index-look-name-è¢«ç¨±çºå»¢ç©çåè±éè¢«å®¶è£¡æµæ¾å¾é¨å¿ææ¬²å°æ´»ä¸å»-cid-41133-id-532108';
  const mojibakeWasteImages = await callPlugin('getChapterImageList', [mojibakeWasteUrl]);
  assert.ok(mojibakeWasteImages.length >= 30, 'mojibake waste hero chapter URL should repair itself');

  const feirenSearch = await callPlugin('getMangaList', [1, 12, '非人哉', '']);
  const feirenItem = feirenSearch.list.find((item) => item.title === '非人哉');
  assert.ok(feirenItem && feirenItem.url, 'feiren zai search result should exist');
  const feirenDetail = await callPlugin('getMangaData', [feirenItem.url]);
  assert.ok(feirenDetail.chapterList.length > 0, 'feiren zai chapters should exist');
  const feirenLatest = feirenDetail.chapterList[0];
  const feirenImages = await callPlugin('getChapterImageList', [feirenLatest.url]);
  assert.ok(feirenImages.length > 0, 'feiren zai latest chapter should parse images');
  const feirenFinal = await callPlugin('getImageUrl', [feirenImages[0].url]);
  assert.ok(/^data:image\/jpeg;base64,/i.test(feirenFinal) || /^https?:\/\//i.test(feirenFinal), 'feiren zai image fallback should return a usable URL form');
  const alternateFeirenImages = await callPlugin('getChapterImageList', ['https://www.2animx.com/index-look-name-????????-cid-32760-id-401364']);
  assert.ok(alternateFeirenImages.length > 0, 'alternate feiren zai question-mark route should repair by cid');

  const organSearch = await callPlugin('getMangaList', [1, 12, '臟器公主', '']);
  const organItem = organSearch.list.find((item) => /臟器公主/.test(item.title));
  assert.ok(organItem && organItem.url, 'organ princess search result should exist');
  const organDetail = await callPlugin('getMangaData', [organItem.url]);
  assert.ok(organDetail.chapterList.length > 0, 'organ princess chapters should exist');
  const organImages = await callPlugin('getChapterImageList', [organDetail.chapterList[0].url]);
  assert.ok(organImages.length >= 40, 'organ princess broken first chapter should fall back to a readable reupload');
  const organFirstImage = await callPlugin('getImageUrl', [organImages[0].url]);
  await assertFinalImageLoads(organFirstImage, 'organ princess first image');

  const genericQuestionImages = await callPlugin('getChapterImageList', ['https://www.2animx.com/index-look-name-??????????????????????????????????????????-cid-32741-id-401203']);
  assert.ok(genericQuestionImages.length >= 30, 'unknown cid question-mark route should repair through source redirect');

  console.log('2Animx plugin tests passed:', {
    list: list.list.length,
    search: search.list.length,
    chapters: detail.chapterList.length,
    images: chapter.length,
    latestImages: latestImages.length,
    kimetsuImages: kimetsuImages.length,
    wasteImages: wasteImages.length,
    feirenImages: feirenImages.length,
    organImages: organImages.length,
    genericQuestionImages: genericQuestionImages.length,
    finalImage,
    finalLastImage,
    latestLastImage: latestLastImage.slice(0, 48) + '...'
  });
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
