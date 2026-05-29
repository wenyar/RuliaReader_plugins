const BASE_URL = 'https://vomicmh.com';
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 1200;
const DEFAULT_LIST_PAGE_SIZE = 24;
const SITE_LIST_PAGE_SIZE = 12;
const MAX_SOURCE_PAGES_PER_REQUEST = 80;

const CATEGORIES = [
  { label: '全部', value: '' },
  { label: '冒险', value: '4' },
  { label: '搞笑', value: '5' },
  { label: '动作', value: '6' },
  { label: '科幻', value: '7' },
  { label: '爱情', value: '8' },
  { label: '侦探', value: '9' },
  { label: '竞技', value: '10' },
  { label: '魔法', value: '11' },
  { label: '校园', value: '12' },
  { label: '百合', value: '13' },
  { label: '耽美', value: '14' },
  { label: '历史', value: '15' },
  { label: '战争', value: '16' },
  { label: '宅系', value: '17' },
  { label: '治愈', value: '18' },
  { label: '武侠', value: '20' },
  { label: '职场', value: '21' },
  { label: '神鬼', value: '22' },
  { label: '奇幻', value: '23' },
  { label: '生活', value: '24' },
  { label: '其他', value: '25' },
  { label: '热血', value: '26' },
  { label: '古风', value: '27' },
  { label: '悬疑', value: '28' },
  { label: '都市', value: '29' },
  { label: '架空', value: '30' },
  { label: '青春', value: '31' },
  { label: '剧情', value: '32' },
  { label: '犯罪', value: '34' },
  { label: '致郁', value: '35' },
  { label: '纯爱', value: '36' },
  { label: '恋爱', value: '37' },
  { label: '体育', value: '38' },
  { label: '末世', value: '39' },
  { label: '少女', value: '40' },
  { label: '重生', value: '41' },
  { label: '美食', value: '43' }
];

const mangaDataCache = {};
const chapterImageCache = {};

function rulia() {
  return window.Rulia && (window.Rulia.Rulia || window.Rulia);
}

function finish(value) {
  rulia().endWithResult(value);
}

function fail(error) {
  const message = error && error.message ? error.message : String(error || 'Unknown error');
  rulia().endWithException(message);
}

function decodeHtml(value) {
  const map = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    '#39': "'",
    nbsp: ' '
  };
  return String(value || '')
    .replace(/\\u0026/g, '&')
    .replace(/\\\//g, '/')
    .replace(/&#(\d+);/g, function (_, code) {
      return String.fromCharCode(parseInt(code, 10));
    })
    .replace(/&#x([0-9a-f]+);/gi, function (_, code) {
      return String.fromCharCode(parseInt(code, 16));
    })
    .replace(/&([a-zA-Z0-9#]+);/g, function (_, name) {
      return Object.prototype.hasOwnProperty.call(map, name) ? map[name] : '&' + name + ';';
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(html) {
  return decodeHtml(String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '));
}

function attr(html, name) {
  const pattern = new RegExp('\\s' + name + '\\s*=\\s*(?:"([^"]*)"|\\\'([^\\\']*)\\\'|([^\\s>]+))', 'i');
  const match = String(html || '').match(pattern);
  return decodeHtml(match ? match[1] || match[2] || match[3] || '' : '');
}

function absoluteUrl(value, base) {
  return new URL(String(value || ''), base || BASE_URL + '/').toString();
}

function normalizeUrl(value) {
  const url = absoluteUrl(value);
  if (!/^https?:\/\//i.test(url)) {
    throw new Error('Invalid URL: ' + value);
  }
  return url;
}

function requestHeaders(referer) {
  return {
    Referer: referer || BASE_URL + '/',
    Origin: BASE_URL,
    'User-Agent': 'Mozilla/5.0'
  };
}

async function requestText(url, referer) {
  return await rulia().httpRequest({
    url: normalizeUrl(url),
    method: 'GET',
    headers: requestHeaders(referer),
    timeout: 20000
  });
}

function parseFilters(raw) {
  if (!raw) {
    return {};
  }
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) || {};
    } catch (_) {
      return {};
    }
  }
  return raw || {};
}

function listUrl(page, keyword, filters) {
  const pageNo = Math.max(1, parseInt(page || '1', 10) || 1);
  const query = String(keyword || '').trim();
  if (query) {
    return BASE_URL + '/so/key/' + encodeURIComponent(query) + '/' + pageNo;
  }
  if (filters && filters.category) {
    return BASE_URL + '/so/cate/' + encodeURIComponent(filters.category) + '/' + pageNo;
  }
  return BASE_URL + '/';
}

function normalizedPageSize(pageSize) {
  const parsed = parseInt(pageSize || DEFAULT_LIST_PAGE_SIZE, 10);
  return parsed > 0 && parsed <= 100 ? parsed : DEFAULT_LIST_PAGE_SIZE;
}

function parseMangaList(html) {
  const result = [];
  const seen = {};
  const re = /<a\b[^>]*href=["']([^"']*\/detail\/\d+[^"']*)["'][^>]*>([\s\S]*?)(?=<a\b[^>]*href=["'][^"']*\/detail\/\d+|<\/body>)/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    const url = absoluteUrl(match[1]);
    if (seen[url]) {
      continue;
    }
    const block = match[2];
    const img = (block.match(/<img\b[^>]*>/i) || [''])[0];
    const title = stripTags((block.match(/<div\b[^>]*class=["'][^"']*title[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) || [])[1])
      || attr(img, 'alt')
      || (url.match(/\/detail\/(\d+)/) || [])[1]
      || 'vomic';
    const coverUrl = attr(img, 'src') || attr(img, 'data-src');
    if (!title || !coverUrl) {
      continue;
    }
    seen[url] = true;
    result.push({
      title: title,
      url: url,
      coverUrl: absoluteUrl(coverUrl)
    });
  }
  return result;
}

async function collectMangaList(page, pageSize, keyword, filters) {
  const pageNo = Math.max(1, parseInt(page || '1', 10) || 1);
  const size = normalizedPageSize(pageSize);
  const query = String(keyword || '').trim();
  const hasPagedSource = !!query || !!(filters && filters.category);
  if (!hasPagedSource) {
    if (pageNo > 1) {
      return [];
    }
    return parseMangaList(await requestText(listUrl(1, query, filters)));
  }

  const startIndex = (pageNo - 1) * size;
  const required = pageNo * size;
  const sourcePageLimit = Math.min(
    MAX_SOURCE_PAGES_PER_REQUEST,
    Math.ceil((required + size) / SITE_LIST_PAGE_SIZE) + 4
  );
  const collected = [];
  const seen = {};

  for (let sourcePage = 1; sourcePage <= sourcePageLimit && collected.length < required; sourcePage++) {
    const sourceList = parseMangaList(await requestText(listUrl(sourcePage, query, filters)));
    if (!sourceList.length) {
      break;
    }
    for (let j = 0; j < sourceList.length; j++) {
      const item = sourceList[j];
      const key = item.url || item.title;
      if (!seen[key]) {
        seen[key] = true;
        collected.push(item);
      }
    }
  }

  return collected.slice(startIndex, startIndex + size);
}

function titleFromDetail(html, fallback) {
  return decodeHtml((html.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i) || [])[1] || '')
    .replace(/\s*-\s*vomic漫.*$/i, '')
    || stripTags((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1]).replace(/\s*-\s*vomic.*$/i, '')
    || fallback
    || 'vomic漫';
}

function descriptionFromDetail(html) {
  return decodeHtml((html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) || [])[1] || '');
}

function coverFromDetail(html) {
  return absoluteUrl(decodeHtml((html.match(/<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i) || [])[1] || ''));
}

function parseChapterList(html, mangaUrl) {
  const result = [];
  const seen = {};
  const re = /<a\b[^>]*href=["']([^"']*\/chapter\/\d+\/\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    const url = absoluteUrl(match[1]);
    if (seen[url]) {
      continue;
    }
    const title = stripTags(match[2]) || '章节';
    if (title === '开始观看') {
      continue;
    }
    seen[url] = true;
    result.push({
      title: title,
      url: url
    });
  }
  if (!result.length) {
    const jsonRe = /\{"id":(\d+),"name":"((?:\\"|[^"])*)","car_id":(\d+),[\s\S]*?"identity":"([^"]+)"[\s\S]*?"img_num":(\d+)/g;
    while ((match = jsonRe.exec(html)) !== null) {
      const chapterUrl = BASE_URL + '/chapter/' + match[3] + '/' + match[1];
      if (!seen[chapterUrl]) {
        seen[chapterUrl] = true;
        result.push({
          title: decodeHtml(match[2].replace(/\\"/g, '"')) || '章节',
          url: chapterUrl
        });
      }
    }
  }
  return result;
}

function parseChapterImages(html) {
  const candidates = [];
  const add = function (url) {
    const clean = decodeHtml(url).replace(/\\+$/g, '');
    if (!/^https?:\/\/cdm\.vomicer\.com\//i.test(clean) || /-cover(?:\?|$)/i.test(clean) || /\/crop\//i.test(clean)) {
      return;
    }
    const match = clean.match(/\/(\d+)\/([0-9a-f]{32})-(\d+)(?:\?|$)/i);
    if (!match) {
      return;
    }
    candidates.push({
      url: clean,
      mangaId: match[1],
      identity: match[2],
      page: parseInt(match[3], 10) || 0
    });
  };
  html.replace(/https:\\?\/\\?\/cdm\.vomicer\.com\\?\/[^"'<>\s]+/gi, function (url) {
    add(url);
    return '';
  });
  html.replace(/https?:\/\/cdm\.vomicer\.com\/[^"'<>\\\s]+/gi, function (url) {
    add(url);
    return '';
  });
  const groups = {};
  for (let i = 0; i < candidates.length; i++) {
    const item = candidates[i];
    const key = item.mangaId + '/' + item.identity;
    groups[key] = groups[key] || {};
    if (!groups[key][item.page]) {
      groups[key][item.page] = item.url;
    }
  }
  let best = null;
  const keys = Object.keys(groups);
  for (let i = 0; i < keys.length; i++) {
    const pages = Object.keys(groups[keys[i]]);
    if (!best || pages.length > best.pages.length) {
      best = { key: keys[i], pages: pages };
    }
  }
  if (!best) {
    return [];
  }
  return best.pages
    .map(function (page) {
      return parseInt(page, 10) || 0;
    })
    .sort(function (a, b) {
      return a - b;
    })
    .map(function (page) {
      const url = groups[best.key][page];
      return {
        url: url,
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT
      };
    });
}

async function setMangaListFilterOptions() {
  finish([
    { label: '分类', name: 'category', options: CATEGORIES }
  ]);
}

async function getMangaList(page, pageSize, keyword, rawFilterOptions) {
  try {
    const legacyCall = arguments.length < 4;
    const searchKeyword = legacyCall ? pageSize : keyword;
    const filters = parseFilters(legacyCall ? keyword : rawFilterOptions);
    finish({ list: await collectMangaList(page, legacyCall ? DEFAULT_LIST_PAGE_SIZE : pageSize, searchKeyword, filters) });
  } catch (error) {
    fail(error);
  }
}

async function getMangaData(dataPageUrl) {
  try {
    const url = normalizeUrl(dataPageUrl);
    if (mangaDataCache[url]) {
      finish(mangaDataCache[url]);
      return;
    }
    const html = await requestText(url);
    const result = {
      title: titleFromDetail(html, (url.match(/\/detail\/(\d+)/) || [])[1]),
      description: descriptionFromDetail(html),
      coverUrl: coverFromDetail(html),
      chapterList: parseChapterList(html, url)
    };
    mangaDataCache[url] = result;
    finish(result);
  } catch (error) {
    fail(error);
  }
}

async function getChapterImageList(chapterUrl) {
  try {
    const url = normalizeUrl(chapterUrl);
    if (chapterImageCache[url]) {
      finish(chapterImageCache[url]);
      return;
    }
    const html = await requestText(url);
    if (/请先登录/.test(html)) {
      throw new Error('需要先在 Rulia 中为 vomicmh.com 保存登录 cookie（_token）。');
    }
    const result = parseChapterImages(html);
    if (!result.length) {
      throw new Error('无法解析章节图片，可能登录 cookie 已失效。');
    }
    chapterImageCache[url] = result;
    finish(result);
  } catch (error) {
    fail(error);
  }
}

async function getImageUrl(url) {
  finish(url);
}
