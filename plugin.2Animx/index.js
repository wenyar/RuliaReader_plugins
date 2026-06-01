const BASE_URL = 'https://www.2animx.com';
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 1200;
const DEFAULT_PAGE_SIZE = 24;
const REQUEST_TIMEOUT = 20000;
const CHAPTER_PAGE_CONCURRENCY = 6;

const FALLBACK_COVER = BASE_URL + '/favicon.ico';

const CATEGORIES = [
  { label: '全部', value: '' },
  { label: '科幻魔幻', value: '1' },
  { label: '少年熱血', value: '2' },
  { label: '東方同人', value: '3' },
  { label: '少女愛情', value: '4' },
  { label: '武俠格鬥', value: '5' },
  { label: '爆笑喜劇', value: '6' },
  { label: '其它漫畫', value: '7' },
  { label: '競技體育', value: '8' },
  { label: '偵探推理', value: '9' },
  { label: '恐怖靈異', value: '10' },
  { label: 'BL', value: '11' },
  { label: '其它類型', value: '12' },
  { label: '戀愛', value: '15' },
  { label: '治癒', value: '16' },
  { label: '校園', value: '19' },
  { label: '熱血', value: '21' },
  { label: '百合', value: '22' },
  { label: '懸疑', value: '23' },
  { label: '搞笑', value: '24' },
  { label: '冒險', value: '25' },
  { label: '科幻', value: '27' },
  { label: '奇幻', value: '29' },
  { label: '限制級', value: '37' }
];

const STATUSES = [
  { label: '全部', value: '' },
  { label: '連載', value: '1' },
  { label: '完結', value: '2' }
];

const SORTS = [
  { label: '添加時間', value: 'pubtime' },
  { label: '觀看次數', value: 'hot' },
  { label: '更新時間', value: 'uptime' }
];

const mangaDataCache = {};
const chapterImageCache = {};
const imageDataUrlCache = {};
const cidRouteCache = {
  '19785': '%E9%AC%BC%E6%BB%85%E4%B9%8B%E5%88%83',
  '21999': '%E9%9D%9E%E4%BA%BA%E5%93%89',
  '32760': '%E9%9D%9E%E4%BA%BA%E5%93%89',
  '32732': '%E8%87%9F%E5%99%A8%E5%85%AC%E4%B8%BB',
  '41133': '%E8%A2%AB%E7%A8%B1%E7%82%BA%E5%BB%A2%E7%89%A9%E7%9A%84%E5%8E%9F%E8%8B%B1%E9%9B%84%E8%A2%AB%E5%AE%B6%E8%A3%A1%E6%B5%81%E6%94%BE%E5%BE%8C%E9%9A%A8%E5%BF%83%E6%89%80%E6%AC%B2%E5%9C%B0%E6%B4%BB%E4%B8%8B%E5%8E%BB'
};
const cidReplacementMap = {
  '32760': '21999'
};

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
    nbsp: ' ',
    mdash: '-',
    hellip: '...'
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
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' '));
}

function attr(html, name) {
  const match = String(html || '').match(new RegExp('\\s' + name + '\\s*=\\s*(?:"([^"]*)"|\\\'([^\\\']*)\\\'|([^\\s>]+))', 'i'));
  return decodeHtml(match ? match[1] || match[2] || match[3] || '' : '');
}

function absoluteUrl(value, base) {
  const raw = decodeHtml(value || '').replace(/^\/\//, 'https://');
  return new URL(raw, base || BASE_URL + '/').toString();
}

function normalizeUrl(value, base) {
  const url = absoluteUrl(value, base || BASE_URL + '/');
  if (!/^https?:\/\//i.test(url)) {
    throw new Error('Invalid URL: ' + value);
  }
  return url;
}

function normalizeImageUrl(value, base) {
  let url = decodeHtml(value || '').replace(/^\/\//, 'https://');
  if (!url || /^data:/i.test(url)) {
    return '';
  }
  url = absoluteUrl(url, base || BASE_URL + '/');
  url = url.replace(/^http:\/\//i, 'https://');
  url = url.replace(/^https:\/\/img\.2animx\.com\/(https?:\/\/image\.2animx\.com\/.+)$/i, '$1');
  url = url.replace(/^https:\/\/img\.2animx\.com\/(https?:\/\/img\.2animx\.com\/.+)$/i, '$1');
  url = url.replace(/^https:\/\/img\.2animx\.com\/https:\/\/img\.2animx\.com\//i, BASE_URL + '/');
  url = url.replace(/^https:\/\/img\.2animx\.com\//i, BASE_URL + '/');
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
  const targetUrl = normalizeUrl(url);
  let httpError = null;
  try {
    const body = await rulia().httpRequest({
      url: targetUrl,
      method: 'GET',
      headers: requestHeaders(referer),
      timeout: REQUEST_TIMEOUT
    });
    if (String(body || '').trim()) {
      return body;
    }
  } catch (error) {
    httpError = error;
  }
  if (typeof fetch === 'function') {
    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        redirect: 'follow',
        headers: requestHeaders(referer)
      });
      if (response && response.ok && response.text) {
        const text = await response.text();
        if (String(text || '').trim()) {
          return text;
        }
      }
    } catch (_) {}
  }
  if (httpError) {
    throw httpError;
  }
  return '';
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  if (typeof btoa === 'function') {
    return btoa(binary);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(binary, 'binary').toString('base64');
  }
  throw new Error('当前环境不支持 base64 编码。');
}

async function imageUrlToDataUrl(url) {
  const imageUrl = normalizeImageUrl(url);
  if (await isMissingSourceImage(imageUrl)) {
    throw new Error('源站图片缺失：2animx 返回了伪 JPEG 404。');
  }
  if (!/^https:\/\/image\.2animx\.com\//i.test(imageUrl)) {
    return imageUrl || url;
  }
  if (imageDataUrlCache[imageUrl]) {
    return imageDataUrlCache[imageUrl];
  }
  if (typeof fetch !== 'function') {
    return imageUrl;
  }
  try {
    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    if (!response || !response.ok || !response.arrayBuffer) {
      return imageUrl;
    }
    const contentType = response.headers && response.headers.get ? response.headers.get('content-type') : 'image/jpeg';
    const buffer = await response.arrayBuffer();
    const dataUrl = 'data:' + (contentType || 'image/jpeg').split(';')[0] + ';base64,' + arrayBufferToBase64(buffer);
    imageDataUrlCache[imageUrl] = dataUrl;
    return dataUrl;
  } catch (_) {
    return imageUrl;
  }
}

async function isMissingSourceImage(url) {
  if (!/^https:\/\/www\.2animx\.com\/upload\//i.test(url || '')) {
    return false;
  }
  try {
    if (typeof fetch === 'function') {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Range: 'bytes=0-15',
          'User-Agent': 'Mozilla/5.0'
        }
      });
      if (!response || !response.arrayBuffer) {
        return false;
      }
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const text = String.fromCharCode.apply(null, bytes).trim();
      return text === '404' || bytes.length <= 3;
    }
  } catch (_) {}
  try {
    const body = await rulia().httpRequest({
      url: url,
      method: 'GET',
      headers: Object.assign({}, requestHeaders(BASE_URL + '/'), { Range: 'bytes=0-15' }),
      timeout: REQUEST_TIMEOUT
    });
    const text = String(body || '').trim();
    return text === '404' || text.length <= 3;
  } catch (_) {
    return false;
  }
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

function listUrl(page, filters) {
  const parts = ['index-html'];
  if (filters.status) {
    parts.push('status-' + encodeURIComponent(filters.status));
  }
  if (filters.category) {
    parts.push('typeid-' + encodeURIComponent(filters.category));
  }
  if (filters.sort) {
    parts.push('sort-' + encodeURIComponent(filters.sort));
  }
  const pageNo = Math.max(1, parseInt(page || '1', 10) || 1);
  if (pageNo > 1) {
    parts.push('page-' + pageNo);
  }
  return BASE_URL + '/' + parts.join('-');
}

function searchUrl(page, keyword) {
  const params = new URLSearchParams();
  params.set('searchType', '1');
  params.set('q', keyword);
  const pageNo = Math.max(1, parseInt(page || '1', 10) || 1);
  if (pageNo > 1) {
    params.set('page', String(pageNo));
  }
  return BASE_URL + '/search-index?' + params.toString();
}

function parseMangaList(html) {
  const result = [];
  const seen = {};
  const listMatch = String(html || '').match(/<ul\b[^>]*class=["'][^"']*\b(?:liemh|htmls|indliemh)\b[^"']*["'][^>]*>([\s\S]*?)<\/ul>/i);
  const source = listMatch ? listMatch[1] : html;
  const re = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  let match;
  while ((match = re.exec(source || '')) !== null) {
    const block = match[1];
    const link = (block.match(/<a\b[^>]*href=["']([^"']*index-comic-[^"']*id-\d+[^"']*)["'][^>]*>/i) || [])[1];
    if (!link) {
      continue;
    }
    const url = absoluteUrl(link);
    if (seen[url]) {
      continue;
    }
    const img = (block.match(/<img\b[^>]*>/i) || [''])[0];
    const title = stripTags((block.match(/<div\b[^>]*class=["'][^"']*\btit\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) || [])[1])
      || attr(block.match(/<a\b[^>]*>/i) || '', 'title')
      || attr(img, 'alt');
    if (!title) {
      continue;
    }
    seen[url] = true;
    result.push({
      title: title,
      url: url,
      coverUrl: normalizeImageUrl(attr(img, 'src') || attr(img, 'data-src')) || FALLBACK_COVER,
      latestChapter: stripTags((block.match(/<em\b[^>]*>([\s\S]*?)<\/em>/i) || [])[1]),
      description: stripTags((block.match(/<font\b[^>]*>([\s\S]*?)<\/font>/i) || [])[1])
    });
  }
  return result;
}

function normalizePageSize(pageSize) {
  const parsed = parseInt(pageSize || DEFAULT_PAGE_SIZE, 10);
  return parsed > 0 && parsed <= 100 ? parsed : DEFAULT_PAGE_SIZE;
}

async function collectMangaList(page, pageSize, keyword, filters) {
  const size = normalizePageSize(pageSize);
  const startPage = Math.max(1, parseInt(page || '1', 10) || 1);
  const query = String(keyword || '').trim();
  if (query && startPage > 1) {
    return [];
  }
  const list = [];
  const seen = {};
  const maxSourcePages = query ? 1 : 4;
  for (let offset = 0; offset < maxSourcePages && list.length < size; offset++) {
    const sourcePage = startPage + offset;
    const html = await requestText(query ? searchUrl(sourcePage, query) : listUrl(sourcePage, filters));
    const parsed = parseMangaList(html);
    if (!parsed.length) {
      break;
    }
    for (let i = 0; i < parsed.length && list.length < size; i++) {
      const item = parsed[i];
      if (!seen[item.url]) {
        seen[item.url] = true;
        list.push(item);
      }
    }
  }
  return list;
}

function parseTitle(html, fallback) {
  return stripTags((html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || [])[1])
    || decodeHtml((html.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i) || [])[1] || '').replace(/漫畫.*$/i, '')
    || stripTags((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1]).replace(/漫畫.*$/i, '')
    || fallback
    || '二次元動漫';
}

function parseCover(html) {
  return normalizeImageUrl((html.match(/<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) || [])[1])
    || normalizeImageUrl((html.match(/<div\b[^>]*class=["'][^"']*\bcomic.*?[\s\S]*?<img\b[^>]*src=["']([^"']+)["']/i) || [])[1])
    || normalizeImageUrl((html.match(/<img\b[^>]*src=["']([^"']*\/upload\/(?:img\/)?icon\/[^"']+)["']/i) || [])[1])
    || FALLBACK_COVER;
}

function parseDescription(html) {
  const text = stripTags((html.match(/漫畫簡介[：:]\s*([\s\S]*?)(?:<h2|<div\b[^>]*class=["'][^"']*\b(?:chapter|lan_bt|footer|box)|##|古惑仔最新漫畫列表|最新漫畫列表|<\/body>)/i) || [])[1]);
  const meta = decodeHtml((html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) || [])[1] || '');
  const author = stripTags((html.match(/漫畫作者[：:]\s*([\s\S]*?)(?:<br|<\/p>|漫畫狀態)/i) || [])[1]);
  const status = stripTags((html.match(/漫畫狀態[：:]\s*([\s\S]*?)(?:<br|<\/p>|漫畫類型)/i) || [])[1]);
  const type = stripTags((html.match(/漫畫類型[：:]\s*([\s\S]*?)(?:<br|<\/p>|上架時間)/i) || [])[1]);
  return [
    text || meta,
    author ? '作者：' + author : '',
    status ? '狀態：' + status : '',
    type ? '類型：' + type : ''
  ].filter(Boolean).join('\n');
}

function parseMangaRouteName(url) {
  const match = String(url || '').match(/index-comic-name-([^/?#]+)-id-\d+/i);
  return match ? match[1] : '';
}

function parseMangaId(url) {
  const match = String(url || '').match(/-id-(\d+)/i);
  return match ? match[1] : '';
}

function routeNameFromTitle(title) {
  return encodeURIComponent(String(title || '').replace(/[、，,。:：!！?？·~～「」『』（）()[\]【】《》〈〉\s]/g, ''));
}

function decodeRouteName(value) {
  let result = decodeHtml(value || '');
  for (let i = 0; i < 2; i++) {
    try {
      const decoded = decodeURIComponent(result);
      if (decoded === result) {
        break;
      }
      result = decoded;
    } catch (_) {
      break;
    }
  }
  return result;
}

function repairMojibake(value) {
  const text = String(value || '');
  if (!/[ÃÂÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßà-ÿ]/.test(text)) {
    return text;
  }
  let encoded = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code <= 0xff) {
      encoded += '%' + code.toString(16).padStart(2, '0');
    } else {
      encoded += encodeURIComponent(text.charAt(i));
    }
  }
  try {
    return decodeURIComponent(encoded);
  } catch (_) {
    return text;
  }
}

function routeTitleVariants(title) {
  const raw = decodeRouteName(title || '');
  const repaired = repairMojibake(raw);
  const compact = raw.replace(/[、，,。:：!！?？·~～「」『』（）()[\]【】《》〈〉\s]/g, '');
  const repairedCompact = repaired.replace(/[、，,。:：!！?？·~～「」『』（）()[\]【】《》〈〉\s]/g, '');
  const variants = [
    compact,
    compact.replace(/后/g, '後'),
    repairedCompact,
    repairedCompact.replace(/后/g, '後')
  ];
  const result = [];
  const seen = {};
  for (let i = 0; i < variants.length; i++) {
    const encoded = encodeURIComponent(variants[i]);
    if (encoded && !seen[encoded]) {
      seen[encoded] = true;
      result.push(encoded);
    }
  }
  return result;
}

function chapterUrlParts(url) {
  const raw = String(url || '');
  if (/\/rulia-2animx-chapter\?/i.test(raw)) {
    try {
      const parsed = new URL(raw, BASE_URL + '/');
      const params = parsed.searchParams;
      const cid = params.get('cid') || '';
      const id = params.get('id') || '';
      if (cid && id) {
        return {
          routeName: params.get('route') || '',
          cid: cid,
          id: id,
          title: params.get('title') || ''
        };
      }
    } catch (_) {}
  }
  const match = String(url || '').match(/index-look-name-(.+?)-cid-(\d+)-id-(\d+)(?:-p-\d+)?(?:[?#].*)?$/i);
  if (!match) {
    return null;
  }
  return {
    routeName: match[1],
    cid: match[2],
    id: match[3],
    title: ''
  };
}

function chapterUrlCandidates(url) {
  const normalized = normalizeUrl(url);
  const parts = chapterUrlParts(normalized);
  if (!parts) {
    return [normalized];
  }
  const sourceUrl = sourceChapterUrlFromParts(parts);
  const candidates = sourceUrl ? [sourceUrl, normalized] : [normalized];
  const decoded = decodeRouteName(parts.routeName);
  candidates.push(BASE_URL + '/index-look-name-x-cid-' + parts.cid + '-id-' + parts.id);
  if (cidRouteCache[parts.cid]) {
    candidates.push(BASE_URL + '/index-look-name-' + cidRouteCache[parts.cid] + '-cid-' + parts.cid + '-id-' + parts.id);
  }
  routeTitleVariants(decoded).forEach(function (routeName) {
    candidates.push(BASE_URL + '/index-look-name-' + routeName + '-cid-' + parts.cid + '-id-' + parts.id);
  });
  const seen = {};
  return candidates.filter(function (candidate) {
    if (seen[candidate]) {
      return false;
    }
    seen[candidate] = true;
    return true;
  });
}

function canonicalChapterUrl(href, mangaRouteName) {
  const cid = (String(href || '').match(/-cid-(\d+)/i) || [])[1];
  const id = (String(href || '').match(/-id-(\d+)/i) || [])[1];
  if (cid && id && mangaRouteName) {
    return BASE_URL + '/index-look-name-' + mangaRouteName + '-cid-' + cid + '-id-' + id;
  }
  return absoluteUrl(href);
}

function chapterPayloadUrl(href, mangaRouteName, title) {
  const cid = (String(href || '').match(/-cid-(\d+)/i) || [])[1];
  const id = (String(href || '').match(/-id-(\d+)/i) || [])[1];
  if (!cid || !id || !mangaRouteName) {
    return canonicalChapterUrl(href, mangaRouteName);
  }
  return BASE_URL + '/rulia-2animx-chapter?cid=' + cid
    + '&id=' + id
    + '&route=' + encodeURIComponent(mangaRouteName)
    + '&title=' + encodeURIComponent(title || '');
}

function sourceChapterUrlFromParts(parts) {
  if (!parts || !parts.cid || !parts.id) {
    return '';
  }
  const routeName = parts.routeName || cidRouteCache[parts.cid] || 'x';
  return BASE_URL + '/index-look-name-' + routeName + '-cid-' + parts.cid + '-id-' + parts.id;
}

function chapterEpisodeKey(title) {
  const match = String(title || '').match(/第\s*([0-9]+(?:\.[0-9]+)?)\s*(?:話|话|回)/);
  return match ? match[1] : '';
}

function preferPageCountReuploads(chapters) {
  const replacementByEpisode = {};
  for (let i = 0; i < chapters.length; i++) {
    const item = chapters[i];
    const key = chapterEpisodeKey(item.title);
    if (key && /[（(]\s*\d+\s*P\s*[）)]/i.test(item.title)) {
      replacementByEpisode[key] = item;
    }
  }
  return chapters.map(function (item) {
    const key = chapterEpisodeKey(item.title);
    const replacement = key && !/[（(]\s*\d+\s*P\s*[）)]/i.test(item.title) ? replacementByEpisode[key] : null;
    return replacement ? {
      title: item.title,
      url: replacement.url
    } : item;
  });
}

function parseChapterList(html, mangaRouteName) {
  const result = [];
  const seen = {};
  const re = /<a\b[^>]*href=["']([^"']*index-look-name-[^"']*cid-\d+-id-\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(html || '')) !== null) {
    const href = match[1];
    if (/-p-\d+/i.test(href)) {
      continue;
    }
    const title = stripTags(match[2]) || attr(match[0], 'title') || '章节';
    if (!title || /^(上一章|下一章|上一頁|下一頁|開始閱讀)$/.test(title)) {
      continue;
    }
    const url = chapterPayloadUrl(href, mangaRouteName, title);
    if (seen[url]) {
      continue;
    }
    seen[url] = true;
    result.push({ title: title, url: url });
  }
  return preferPageCountReuploads(result);
}

function pageUrl(chapterUrl, page) {
  if (page <= 1) {
    return chapterUrl.replace(/-p-\d+$/i, '');
  }
  const clean = chapterUrl.replace(/-p-\d+$/i, '');
  return clean + '-p-' + page;
}

function parseTotalPages(html) {
  const hidden = (html.match(/<input\b[^>]*id=["']total["'][^>]*value=["'](\d+)["']/i) || [])[1];
  if (hidden) {
    return Math.max(1, parseInt(hidden, 10) || 1);
  }
  const titleTotal = (html.match(/第\s*\d+\s*\/\s*(\d+)\s*頁/i) || [])[1];
  return Math.max(1, parseInt(titleTotal || '1', 10) || 1);
}

function parsePageImage(html, pageBaseUrl) {
  const comicPic = (html.match(/<img\b[^>]*id=["']ComicPic["'][^>]*>/i) || [''])[0];
  const url = attr(comicPic, 'src')
    || (html.match(/<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) || [])[1]
    || (html.match(/https?:\\?\/\\?\/image\.2animx\.com\\?\/img\\?\/[^"'<>\\\s]+/i) || [])[0]
    || (html.match(/https?:\\?\/\\?\/(?:img|www)\.2animx\.com\\?\/upload\\?\/[^"'<>\\\s]+/i) || [])[0]
    || (html.match(/["'](\/upload\/[^"'<>]+)["']/i) || [])[1];
  return normalizeImageUrl(url, pageBaseUrl);
}

async function collectPageImages(chapterUrl, total, firstImage) {
  const result = [];
  if (firstImage) {
    result.push({ url: firstImage, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  }
  const pages = [];
  for (let page = 2; page <= total; page++) {
    pages.push(page);
  }
  for (let start = 0; start < pages.length; start += CHAPTER_PAGE_CONCURRENCY) {
    const batch = pages.slice(start, start + CHAPTER_PAGE_CONCURRENCY);
    const items = await Promise.all(batch.map(async function (page) {
      const currentUrl = pageUrl(chapterUrl, page);
      const html = await requestText(currentUrl, chapterUrl);
      const imageUrl = parsePageImage(html, currentUrl);
      return imageUrl ? { page: page, url: imageUrl, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT } : null;
    }));
    items
      .filter(Boolean)
      .sort(function (a, b) { return a.page - b.page; })
      .forEach(function (item) {
        result.push({ url: item.url, width: item.width, height: item.height });
      });
  }
  return result;
}

function detailUrlFromChapterUrl(chapterUrl) {
  const parts = chapterUrlParts(chapterUrl);
  if (!parts) {
    return '';
  }
  const routeName = parts.routeName || cidRouteCache[parts.cid] || 'x';
  return BASE_URL + '/index-comic-name-' + routeName + '-id-' + parts.cid;
}

async function findAlternativeChapterImages(chapterUrl, total) {
  const detailUrl = detailUrlFromChapterUrl(chapterUrl);
  if (!detailUrl) {
    return [];
  }
  try {
    const html = await requestText(detailUrl, chapterUrl);
    const routeName = parseMangaRouteName(detailUrl);
    const chapters = parseChapterList(html, routeName);
    for (let i = chapters.length - 1; i >= 0; i--) {
      const candidate = chapters[i];
      if (!candidate || candidate.url === chapterUrl) {
        continue;
      }
      const candidateHtml = await requestText(candidate.url, detailUrl);
      if (parseTotalPages(candidateHtml) !== total) {
        continue;
      }
      const candidateImage = parsePageImage(candidateHtml, candidate.url);
      if (candidateImage) {
        return await collectPageImages(candidate.url, total, candidateImage);
      }
    }
  } catch (_) {
    return [];
  }
  return [];
}

function detailUrlFromCid(cid) {
  const routeName = cidRouteCache[cid];
  return routeName ? BASE_URL + '/index-comic-name-' + routeName + '-id-' + cid : '';
}

function findChapterById(chapters, id) {
  for (let i = 0; i < chapters.length; i++) {
    if (new RegExp('-id-' + id + '(?:\\D|$)').test(chapters[i].url)) {
      return chapters[i];
    }
  }
  return null;
}

function findChapterByEpisode(chapters, key) {
  let fallback = null;
  for (let i = 0; i < chapters.length; i++) {
    if (chapterEpisodeKey(chapters[i].title) !== key) {
      continue;
    }
    if (/[（(]\s*\d+\s*P\s*[）)]/i.test(chapters[i].title)) {
      return chapters[i];
    }
    fallback = fallback || chapters[i];
  }
  return fallback;
}

async function imagesFromChapterUrl(chapterUrl) {
  const parts = chapterUrlParts(chapterUrl);
  const sourceUrl = parts ? sourceChapterUrlFromParts(parts) : chapterUrl;
  const firstHtml = await requestText(sourceUrl);
  const total = parseTotalPages(firstHtml);
  const firstImage = parsePageImage(firstHtml, sourceUrl);
  return await collectPageImages(sourceUrl, total, firstImage);
}

async function findReplacementCidImages(chapterUrl) {
  const parts = chapterUrlParts(chapterUrl);
  if (!parts || !cidReplacementMap[parts.cid]) {
    return [];
  }
  const sourceDetailUrl = detailUrlFromCid(parts.cid);
  const targetCid = cidReplacementMap[parts.cid];
  const targetDetailUrl = detailUrlFromCid(targetCid);
  if (!sourceDetailUrl || !targetDetailUrl) {
    return [];
  }
  try {
    let key = parts.title ? chapterEpisodeKey(parts.title) : '';
    if (!key) {
      const sourceHtml = await requestText(sourceDetailUrl, chapterUrl);
      const sourceChapters = parseChapterList(sourceHtml, cidRouteCache[parts.cid]);
      const sourceChapter = findChapterById(sourceChapters, parts.id);
      key = sourceChapter ? chapterEpisodeKey(sourceChapter.title) : '';
    }
    if (!key) {
      return [];
    }
    const targetHtml = await requestText(targetDetailUrl, sourceDetailUrl);
    const targetChapters = parseChapterList(targetHtml, cidRouteCache[targetCid]);
    const targetChapter = findChapterByEpisode(targetChapters, key);
    return targetChapter ? await imagesFromChapterUrl(targetChapter.url) : [];
  } catch (_) {
    return [];
  }
}

async function setMangaListFilterOptions() {
  finish([
    { label: '狀態', name: 'status', options: STATUSES },
    { label: '分類', name: 'category', options: CATEGORIES },
    { label: '排序', name: 'sort', options: SORTS }
  ]);
}

async function getMangaList(page, pageSize, keyword, rawFilterOptions) {
  try {
    const legacyCall = arguments.length < 4;
    const searchKeyword = legacyCall ? pageSize : keyword;
    const filters = parseFilters(legacyCall ? keyword : rawFilterOptions);
    const size = legacyCall ? DEFAULT_PAGE_SIZE : pageSize;
    const list = await collectMangaList(page, size, searchKeyword, filters);
    const isSearch = !!String(searchKeyword || '').trim();
    finish({
      list: list,
      hasNext: !isSearch,
      hasNextPage: !isSearch,
      noMore: isSearch,
      totalPage: isSearch ? 1 : undefined,
      pageCount: isSearch ? 1 : undefined,
      listTotalPage: isSearch ? 1 : undefined
    });
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
    const title = parseTitle(html);
    const mangaRouteName = parseMangaRouteName(url) || routeNameFromTitle(title);
    const mangaId = parseMangaId(url);
    if (mangaId && mangaRouteName) {
      cidRouteCache[mangaId] = mangaRouteName;
    }
    const chapterList = parseChapterList(html, mangaRouteName);
    if (!chapterList.length) {
      throw new Error('无法解析章节目录。');
    }
    const result = {
      title: title,
      description: parseDescription(html),
      coverUrl: parseCover(html),
      chapterList: chapterList
    };
    mangaDataCache[url] = result;
    finish(result);
  } catch (error) {
    fail(error);
  }
}

async function getChapterImageList(chapterUrl) {
  try {
    const originalUrl = /\/rulia-2animx-chapter\?/i.test(String(chapterUrl || ''))
      ? absoluteUrl(chapterUrl)
      : normalizeUrl(chapterUrl);
    if (chapterImageCache[originalUrl]) {
      finish(chapterImageCache[originalUrl]);
      return;
    }
    const replacementImages = await findReplacementCidImages(originalUrl);
    if (replacementImages.length) {
      chapterImageCache[originalUrl] = replacementImages;
      finish(replacementImages);
      return;
    }
    const candidates = chapterUrlCandidates(originalUrl);
    let lastTotal = 1;
    for (let i = 0; i < candidates.length; i++) {
      const url = candidates[i];
      try {
        if (chapterImageCache[url]) {
          chapterImageCache[originalUrl] = chapterImageCache[url];
          finish(chapterImageCache[url]);
          return;
        }
        const firstHtml = await requestText(url);
        const total = parseTotalPages(firstHtml);
        lastTotal = total;
        const firstImage = parsePageImage(firstHtml, url);
        const result = await collectPageImages(url, total, firstImage);
        if (result.length) {
          chapterImageCache[url] = result;
          chapterImageCache[originalUrl] = result;
          finish(result);
          return;
        }
      } catch (_) {}
    }
    for (let i = 0; i < candidates.length; i++) {
      const alternative = await findAlternativeChapterImages(candidates[i], lastTotal);
      if (alternative.length) {
        chapterImageCache[candidates[i]] = alternative;
        chapterImageCache[originalUrl] = alternative;
        finish(alternative);
        return;
      }
    }
    throw new Error('无法解析章节图片。候选地址：' + candidates.slice(0, 3).join(' | '));
  } catch (error) {
    fail(error);
  }
}

async function getImageUrl(path) {
  try {
    finish(await imageUrlToDataUrl(path));
  } catch (error) {
    fail(error);
  }
}
