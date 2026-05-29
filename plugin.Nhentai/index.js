const BASE_URL = 'https://nhentai.net';
const API_GALLERIES_URL = BASE_URL + '/api/v2/galleries';
const API_SEARCH_URL = BASE_URL + '/api/v2/search';
const THUMB_BASE_URL = 'https://t.nhentai.net/';
const IMAGE_BASE_URL = 'https://i.nhentai.net/galleries/';
const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 1800;
const MIN_REQUEST_INTERVAL = 1500;
const RETRY_DELAYS = [3000, 7000, 12000];

const galleryCache = {};
const responseCache = {};
let requestQueue = Promise.resolve();
let lastRequestTime = 0;

const LANGUAGES = [
  { label: '全部', value: '' },
  { label: 'English', value: 'english' },
  { label: 'Japanese', value: 'japanese' },
  { label: 'Chinese', value: 'chinese' }
];

const TAG_NAMES = 'big breasts|sole female|sole male|group|anal|nakadashi|lolicon|stockings|blowjob|schoolgirl uniform|full color|glasses|shotacon|rape|mosaic censorship|yaoi|ahegao|bondage|multi-work series|males only|incest|x-ray|milf|dark skin|paizuri|sex toys|netorare|futanari|double penetration|defloration|tankoubon|twintails|ffm threesome|full censorship|swimsuit|yuri|femdom|ponytail|impregnation|collar|big penis|dilf|anal intercourse|hairy|kemonomimi|cheating|kissing|muscle|pantyhose|bbm|big ass|tentacles|story arc|masturbation|sister|bikini|mind control|uncensored|sweating|lactation|crossdressing|mind break|tomgirl|mmf threesome|huge breasts|schoolboy uniform|pregnant|exhibitionism|unusual pupils|females only|teacher|fingering|maid|gloves|handjob|beauty mark|mother|condom|gender bender|harem|lingerie|very long hair|cunnilingus|rough translation|tail|urination|horns|footjob|piercing|small breasts|catgirl|big areolae|gag|demon girl|anthology|drugs|extraneous ads|prostitution|filming|stomach deformation|garter belt|bald|elf|bunny girl|gyaru|blindfold|blackmail|squirting|scat|tanlines|virginity|kimono|halo|bukkake|bbw|nipple stimulation|no penetration|rimjob|inflation|sole dickgirl|deepthroat|eye-covering bang|sleeping|monster|bloomers|inseki|leotard|inverted nipples|webtoon|breast feeding|tomboy|business suit|corruption|blowjob face|crotch tattoo|monster girl|thigh high boots|scanmark|wings|school swimsuit|slave|strap-on|bodysuit|snuff|bestiality|daughter|humiliation|dickgirl on dickgirl|magical girl|hair buns|shemale|tall girl|enema|cervix penetration|urethra insertion|guro|fox girl|breast expansion|bisexual|shibari|latex|smell|nurse|vtuber|old man|prostate massage|dickgirl on male|drunk|ryona|hidden sex|big nipples|dickgirl on female|leg lock|dick growth|hairy armpits|replaced|transformation|apron|pixie cut|bdsm|military|chikan|oppai loli|nun|miko|facial hair|spanking|torture|tribadism|gokkun|tail plug|voyeurism|masked face|incomplete|oyakodon|leash|possession|multiple orgasms|facesitting|exposed clothing|fisting|male on dickgirl|gyaru-oh|cosplaying|bike shorts|chastity belt|vore|feminization|artbook|oni|eyepatch|birth|blood|emotionless sex|nipple fuck|small penis|body modification|twins|tiara|cowgirl|focus anal|solo action|huge penis|pegging|tracksuit|cumflation|gaping|orgasm denial|piss drinking|foot licking|asphyxiation|hotpants|mesuiki|amputee|smegma|full-packaged futanari|giantess|cbt|multimouth blowjob|chloroform|pasties|smalldom|fishnets|sumata|cousin|yandere|body writing|large insertions|triple penetration|robot|thick eyebrows|demon|scar|milking|aunt|tall man|brother|mouth mask|moral degeneration|farting|frottage|swinging|shimaidon|painted nails|soushuuhen|big balls|vaginal birth|unusual teeth|cheerleader|onahole|body swap|eggs|double vaginal|ball sucking|clothed female nude male|chinese dress|miniguy|witch|josou seme|freckles|randoseru|gender morph|phimosis|petplay|prolapse|tickling|public use|niece|crying|high heels|armpit licking|kunoichi|big clit|lab coat|orc|dog girl|waitress|clit stimulation|nose hook|machine|parasite|nipple piercing|shimapan|eyemask|first person perspective|slime|low lolicon|bride|double anal|dog|large tattoo|catboy|kodomo doushi|goblin|forced exposure|watermarked|wolf girl|diaper|widow|christmas|dickgirls only|tutor|netorase|school gym uniform|long tongue|ai generated|sunglasses|ghost|futanarization|angel|stuck in wall|multiple paizuri|shaved head|compilation|domination loss|armpit sex|corset|vomit|human pet|coprophagia|time stop|all the way through|unbirth|clothed paizuri|variant set|age regression|skinsuit|nudity only|sundress|focus blowjob|selfcest|insect|vampire|mmm threesome|drill hair|age progression|coach|detached sleeves|mesugaki|minigirl';

const TAGS = [{ label: '全部', value: '' }].concat(TAG_NAMES.split('|').map(function (name) {
  return { label: name, value: name };
}));

const SORTS = [
  { label: '最新', value: 'date' },
  { label: '今日流行', value: 'popular-today' },
  { label: '本周流行', value: 'popular-week' },
  { label: '总人气', value: 'popular' }
];

function rulia() {
  return window.Rulia && (window.Rulia.Rulia || window.Rulia);
}

function finish(value) {
  rulia().endWithResult(value);
}

function fail(error) {
  rulia().endWithException(error && error.message ? error.message : String(error || 'Unknown error'));
}

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function isRateLimitError(error) {
  return /(?:\b429\b|rate limit|too many requests)/i.test(String(error && error.message || error || ''));
}

function filterValue(value) {
  if (value && typeof value === 'object') {
    value = value.value || value.name || value.label || '';
  }
  value = String(value || '').trim();
  return value === '全部' || value.toLowerCase() === 'all' ? '' : value;
}

function parseFilters(raw) {
  if (!raw) {
    return {};
  }
  if (typeof raw !== 'string') {
    raw = raw || {};
    return {
      language: filterValue(raw.language),
      tag: filterValue(raw.tag),
      sort: filterValue(raw.sort)
    };
  }
  try {
    const parsed = JSON.parse(raw) || {};
    return {
      language: filterValue(parsed.language),
      tag: filterValue(parsed.tag),
      sort: filterValue(parsed.sort)
    };
  } catch (_) {
    return {};
  }
}

function normalizeNhentaiUrl(value) {
  const url = new URL(String(value || ''), BASE_URL + '/').toString();
  if (!/^https:\/\/nhentai\.net\//i.test(url) && !/^https:\/\/i\.nhentai\.net\//i.test(url) && !/^https:\/\/t\.nhentai\.net\//i.test(url)) {
    throw new Error('Invalid nHentai URL: ' + value);
  }
  return url;
}

function requestHeaders(referer) {
  return {
    Referer: referer || BASE_URL + '/',
    Origin: BASE_URL,
    Accept: 'application/json,text/plain,*/*',
    'User-Agent': 'Mozilla/5.0'
  };
}

async function requestText(url, referer) {
  const normalizedUrl = normalizeNhentaiUrl(url);
  const run = async function () {
    const now = Date.now();
    const wait = Math.max(0, MIN_REQUEST_INTERVAL - (now - lastRequestTime));
    if (wait) {
      await sleep(wait);
    }
    lastRequestTime = Date.now();
    return await rulia().httpRequest({
      url: normalizedUrl,
      method: 'GET',
      headers: requestHeaders(referer),
      timeout: 25000
    });
  };
  requestQueue = requestQueue.catch(function () {}).then(run);
  return await requestQueue;
}

async function requestJson(url, referer) {
  const normalizedUrl = normalizeNhentaiUrl(url);
  let lastError = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const text = await requestText(normalizedUrl, referer);
      const json = JSON.parse(text);
      if (json && json.error) {
        throw new Error(json.error);
      }
      responseCache[normalizedUrl] = json;
      return json;
    } catch (error) {
      lastError = error;
      if (!isRateLimitError(error) || attempt >= RETRY_DELAYS.length) {
        break;
      }
      await sleep(RETRY_DELAYS[attempt]);
    }
  }
  if (isRateLimitError(lastError) && responseCache[normalizedUrl]) {
    return responseCache[normalizedUrl];
  }
  throw lastError;
}

function titleOf(item) {
  return String(item && (item.english_title || item.display_title || typeof item.title === 'string' && item.title || item.title && item.title.english || item.title && item.title.pretty || item.japanese_title || item.title && item.title.japanese || item.id) || 'nHentai');
}

function thumbnailUrl(item) {
  if (item && item.coverUrl) {
    return item.coverUrl;
  }
  const thumbnail = item && item.thumbnail && typeof item.thumbnail === 'object' ? item.thumbnail.path : String(item && item.thumbnail || '');
  if (/^https?:\/\//i.test(thumbnail)) {
    return thumbnail;
  }
  if (thumbnail) {
    return new URL(thumbnail.replace(/^\/+/, ''), THUMB_BASE_URL).toString();
  }
  const cover = item && item.cover && typeof item.cover === 'object' ? item.cover.path : '';
  if (cover) {
    return new URL(cover.replace(/^\/+/, ''), THUMB_BASE_URL).toString();
  }
  if (item && item.media_id) {
    return THUMB_BASE_URL + 'galleries/' + item.media_id + '/thumb.webp';
  }
  return BASE_URL + '/favicon.ico';
}

function galleryUrl(id) {
  return BASE_URL + '/g/' + encodeURIComponent(String(id)) + '/';
}

function listItemUrl(item) {
  return galleryUrl(item.id);
}

function cacheGallery(item) {
  if (!item || !item.id) {
    return;
  }
  galleryCache[String(item.id)] = item;
  galleryCache[galleryUrl(item.id)] = item;
}

function itemToManga(item) {
  cacheGallery(item);
  return {
    title: titleOf(item),
    url: listItemUrl(item),
    coverUrl: thumbnailUrl(item)
  };
}

function buildQuery(keyword, filters) {
  const parts = [];
  const text = String(keyword || '').trim();
  if (text) {
    parts.push(text);
  }
  const language = filterValue(filters.language);
  const tag = filterValue(filters.tag);
  if (language) {
    parts.push('language:"' + language + '"');
  }
  if (tag) {
    parts.push('tag:"' + tag + '"');
  }
  return parts.length ? parts.join(' ') : '*';
}

function buildSearchUrl(page, keyword, filters) {
  const query = encodeURIComponent(buildQuery(keyword, filters));
  const sort = encodeURIComponent(filterValue(filters.sort) || 'date');
  const pageNo = encodeURIComponent(String(Math.max(1, parseInt(page || '1', 10) || 1)));
  return API_SEARCH_URL + '?query=' + query + '&sort=' + sort + '&page=' + pageNo;
}

function buildGalleriesUrl(page) {
  return API_GALLERIES_URL + '?page=' + encodeURIComponent(String(Math.max(1, parseInt(page || '1', 10) || 1)));
}

function shouldUseGalleries(keyword, filters) {
  const sort = filterValue(filters.sort) || 'date';
  return !String(keyword || '').trim() && !filterValue(filters.language) && !filterValue(filters.tag) && sort === 'date';
}

function galleryIdFromUrl(url) {
  const text = String(url || '');
  return (text.match(/\/g\/(\d+)/i) || [])[1] || (text.match(/(?:^|[?&])id=(\d+)/i) || [])[1] || '';
}

function imageExt(page) {
  const type = String(page && (page.t || page.type || '')).toLowerCase();
  if (type === 'j' || type === 'jpg' || type === 'jpeg') {
    return 'jpg';
  }
  if (type === 'p' || type === 'png') {
    return 'png';
  }
  if (type === 'g' || type === 'gif') {
    return 'gif';
  }
  return 'webp';
}

function imageInfoFromApiGallery(gallery) {
  const mediaId = String(gallery && gallery.media_id || '');
  const pages = gallery && Array.isArray(gallery.pages) ? gallery.pages
    : gallery && gallery.images && Array.isArray(gallery.images.pages) ? gallery.images.pages
      : [];
  if (!mediaId || !pages.length) {
    return [];
  }
  return pages.map(function (page, index) {
    return {
      url: page.path ? new URL(String(page.path).replace(/^\/+/, ''), 'https://i.nhentai.net/').toString() : IMAGE_BASE_URL + mediaId + '/' + (index + 1) + '.' + imageExt(page),
      width: Number(page.width || page.w) || DEFAULT_WIDTH,
      height: Number(page.height || page.h) || DEFAULT_HEIGHT
    };
  });
}

function imageInfoFromSearchItem(item) {
  const mediaId = String(item && item.media_id || '');
  const count = Math.max(0, parseInt(item && item.num_pages || '0', 10) || 0);
  const result = [];
  for (let i = 1; i <= count; i++) {
    result.push({
      url: IMAGE_BASE_URL + mediaId + '/' + i + '.webp',
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT
    });
  }
  return result;
}

function chapterPayload(item) {
  return galleryUrl(item.id);
}

function parseChapterPayload(value) {
  return { id: galleryIdFromUrl(value) };
}

function galleryToMangaData(gallery, fallback) {
  const item = gallery || fallback || {};
  const title = titleOf(item);
  const imageList = imageInfoFromApiGallery(gallery);
  const searchImageList = imageInfoFromSearchItem(item);
  const chapterItem = {
    id: item.id,
    media_id: item.media_id,
    num_pages: imageList.length || searchImageList.length || item.num_pages,
    title,
    thumbnail: item.thumbnail
  };
  cacheGallery(chapterItem);
  return {
    title,
    description: [
      item.japanese_title || item.title && item.title.japanese ? 'Japanese: ' + (item.japanese_title || item.title.japanese) : '',
      item.num_pages ? 'Pages: ' + item.num_pages : '',
      item.num_favorites ? 'Favorites: ' + item.num_favorites : ''
    ].filter(Boolean).join('\n'),
    coverUrl: thumbnailUrl(item),
    chapterList: [
      {
        title: '全篇',
        url: chapterPayload(chapterItem)
      }
    ]
  };
}

async function fetchGalleryData(id) {
  return await requestJson(API_GALLERIES_URL + '/' + encodeURIComponent(id), galleryUrl(id));
}

async function setMangaListFilterOptions() {
  finish([
    { label: '语言', name: 'language', options: LANGUAGES },
    { label: '标签', name: 'tag', options: TAGS },
    { label: '排序', name: 'sort', options: SORTS }
  ]);
}

async function getMangaList(page, pageSize, keyword, rawFilterOptions) {
  let listUrl = '';
  try {
    const legacyCall = arguments.length < 4;
    const filters = parseFilters(legacyCall ? keyword : rawFilterOptions);
    const searchKeyword = legacyCall ? pageSize : keyword;
    listUrl = shouldUseGalleries(searchKeyword, filters) ? buildGalleriesUrl(page) : buildSearchUrl(page, searchKeyword, filters);
    const json = await requestJson(listUrl);
    const rows = Array.isArray(json.result) ? json.result : [];
    finish({ list: rows.filter(function (item) { return item && item.id && !item.blacklisted; }).map(itemToManga) });
  } catch (error) {
    if (isRateLimitError(error)) {
      const cached = listUrl ? responseCache[normalizeNhentaiUrl(listUrl)] : null;
      const rows = cached && Array.isArray(cached.result) ? cached.result : [];
      finish({ list: rows.filter(function (item) { return item && item.id && !item.blacklisted; }).map(itemToManga) });
      return;
    }
    fail(error);
  }
}

async function getMangaData(dataPageUrl) {
  try {
    const url = normalizeNhentaiUrl(dataPageUrl);
    const id = galleryIdFromUrl(url);
    if (!id) {
      throw new Error('无法识别作品 ID。');
    }
    try {
      const gallery = await fetchGalleryData(id);
      cacheGallery(gallery);
      finish(galleryToMangaData(gallery, null));
      return;
    } catch (_) {
      const cached = galleryCache[id] || galleryCache[url];
      if (cached) {
        finish(galleryToMangaData(null, cached));
        return;
      }
      throw new Error('无法读取详情接口。请确认当前网络可访问 nhentai.net。');
    }
  } catch (error) {
    fail(error);
  }
}

async function getChapterImageList(chapterUrl) {
  try {
    const payload = parseChapterPayload(chapterUrl);
    if (!payload.id) {
      throw new Error('无法识别章节数据。');
    }
    const cached = galleryCache[payload.id];
    if (cached && (cached.pages || cached.images && cached.images.pages)) {
      finish(imageInfoFromApiGallery(cached));
      return;
    }
    const gallery = await fetchGalleryData(payload.id);
    cacheGallery(gallery);
    const result = imageInfoFromApiGallery(gallery);
    if (!result.length) {
      throw new Error('无法解析图片列表。');
    }
    finish(result);
  } catch (error) {
    fail(error);
  }
}

async function getImageUrl(url) {
  finish(url);
}
