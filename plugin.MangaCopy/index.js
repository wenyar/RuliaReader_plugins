const BASE_URL = 'https://www.2026copy.com';
const MIRROR_URL = 'https://www.mangacopy.com';
const MOBILE_API_URLS = [
	'https://api.manga2026.xyz',
	'https://mapi.mangacopy.com',
	'https://api.manga-copy.com'
];
const FALLBACK_COVER = 'https://s3.mangafunb.fun/static/free.ico';
const DEFAULT_IMAGE_WIDTH = 800;
const DEFAULT_IMAGE_HEIGHT = 1200;
const SITE_PAGE_SIZE = 50;
const LIST_PAGE_SIZE = 30;
const REQUEST_TIMEOUT = 8000;
const CHAPTER_LIST_TIMEOUT = 8000;
const DETAIL_CHAPTER_TIMEOUT = 15000;
const RETRY_DELAY = 350;
const MOBILE_RETRY_ROUNDS = 2;
const DETAIL_KEY = 'op0zzpvv.nmn.00p';
const CONTENT_KEY = 'op0zzpvv.nmn.00p';

const mangaDataCache = {};
const chapterListCache = {};
const chapterImageCache = {};
const mangaListItemCache = {};
const ALL_FILTER_VALUE = '__all__';

const THEMES = [
	{ label: '全部', value: ALL_FILTER_VALUE },
	{ label: '愛情', value: 'aiqing' },
	{ label: '歡樂向', value: 'huanlexiang' },
	{ label: '冒險', value: 'maoxian' },
	{ label: '奇幻', value: 'qihuan' },
	{ label: '百合', value: 'baihe' },
	{ label: '校园', value: 'xiaoyuan' },
	{ label: '科幻', value: 'kehuan' },
	{ label: '東方', value: 'dongfang' },
	{ label: '耽美', value: 'danmei' },
	{ label: '生活', value: 'shenghuo' },
	{ label: '格鬥', value: 'gedou' },
	{ label: '轻小说', value: 'qingxiaoshuo' },
	{ label: '其他', value: 'qita' },
	{ label: '悬疑', value: 'xuanyi' },
	{ label: 'TL', value: 'teenslove' },
	{ label: '萌系', value: 'mengxi' },
	{ label: '神鬼', value: 'shengui' },
	{ label: '职场', value: 'zhichang' },
	{ label: '治愈', value: 'zhiyu' },
	{ label: '节操', value: 'jiecao' },
	{ label: '四格', value: 'sige' },
	{ label: '長條', value: 'changtiao' },
	{ label: '舰娘', value: 'jianniang' },
	{ label: '搞笑', value: 'gaoxiao' },
	{ label: '竞技', value: 'jingji' },
	{ label: '伪娘', value: 'weiniang' },
	{ label: '魔幻', value: 'mohuan' },
	{ label: '热血', value: 'rexue' },
	{ label: '性转换', value: 'xingzhuanhuan' },
	{ label: '美食', value: 'meishi' },
	{ label: '励志', value: 'lizhi' },
	{ label: '彩色', value: 'COLOR' },
	{ label: '後宮', value: 'hougong' },
	{ label: '侦探', value: 'zhentan' },
	{ label: '惊悚', value: 'jingsong' },
	{ label: 'AA', value: 'aa' },
	{ label: '音乐舞蹈', value: 'yinyuewudao' },
	{ label: '异世界', value: 'yishijie' },
	{ label: '战争', value: 'zhanzheng' },
	{ label: '历史', value: 'lishi' },
	{ label: '机战', value: 'jizhan' },
	{ label: '都市', value: 'dushi' },
	{ label: '穿越', value: 'chuanyue' },
	{ label: 'C102', value: 'comiket102' },
	{ label: '重生', value: 'chongsheng' },
	{ label: '恐怖', value: 'kongbu' },
	{ label: 'C103', value: 'comiket103' },
	{ label: '生存', value: 'shengcun' },
	{ label: 'C100', value: 'comiket100' },
	{ label: 'C104', value: 'comiket104' },
	{ label: 'C101', value: 'comiket101' },
	{ label: 'C99', value: 'comiket99' },
	{ label: 'C97', value: 'comiket97' },
	{ label: '武侠', value: 'wuxia' },
	{ label: '宅系', value: 'zhaixi' },
	{ label: 'C96', value: 'comiket96' },
	{ label: 'C105', value: 'comiket105' },
	{ label: 'C98', value: 'C98' },
	{ label: 'C95', value: 'comiket95' },
	{ label: '转生', value: 'zhuansheng' },
	{ label: 'FATE', value: 'fate' },
	{ label: '無修正', value: 'Uncensored' },
	{ label: '仙侠', value: 'xianxia' },
	{ label: 'LoveLive', value: 'loveLive' },
	{ label: '雜誌附贈寫真集', value: 'zazhifuzengxiezhenji' }
];

const REGIONS = [
	{ label: '全部', value: ALL_FILTER_VALUE },
	{ label: '日漫', value: '0' },
	{ label: '韩漫', value: '1' },
	{ label: '美漫', value: '2' }
];

const STATUSES = [
	{ label: '全部', value: ALL_FILTER_VALUE },
	{ label: '连载中', value: '0' },
	{ label: '已完结', value: '1' },
	{ label: '短篇', value: '2' }
];

const ORDERINGS = [
	{ label: '更新时间', value: 'datetime_updated' },
	{ label: '热门', value: '-popular' }
];

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

function absoluteUrl(url, base) {
	if (!url) {
		return '';
	}
	return new URL(String(url).trim(), base || BASE_URL).toString();
}

function decodeHtml(text) {
	if (!text) {
		return '';
	}
	const entities = {
		amp: '&',
		lt: '<',
		gt: '>',
		quot: '"',
		'#39': "'",
		nbsp: ' ',
		hellip: '...',
		ldquo: '“',
		rdquo: '”'
	};
	return String(text)
		.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
		.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
		.replace(/&([a-zA-Z0-9#]+);/g, (_, name) => entities[name] || '&' + name + ';')
		.replace(/\s+/g, ' ')
		.trim();
}

function stripTags(html) {
	return decodeHtml((html || '')
		.replace(/<script[\s\S]*?<\/script>/gi, '')
		.replace(/<style[\s\S]*?<\/style>/gi, '')
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<[^>]+>/g, ' '));
}

function attr(html, name) {
	const match = (html || '').match(new RegExp('\\s' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i'));
	return decodeHtml((match && (match[1] || match[2] || match[3])) || '');
}

function normalizeRequestUrl(value, base) {
	const rawUrl = typeof value === 'string' ? value : (value && (value.url || value.href)) || '';
	const url = absoluteUrl(rawUrl, base || BASE_URL);
	if (!/^https?:\/\//i.test(url)) {
		throw new Error('Invalid request URL: ' + rawUrl);
	}
	return url;
}

function isMobileApiOrigin(origin) {
	return MOBILE_API_URLS.indexOf(origin) >= 0;
}

function mobileApiUrl(baseUrl, path) {
	return baseUrl + path;
}

function requestHeaders(referer, requestUrl) {
	const requestOrigin = requestUrl ? new URL(normalizeRequestUrl(requestUrl)).origin : BASE_URL;
	const headers = {
		'User-Agent': 'Mozilla/5.0'
	};
	if (referer) {
		headers.Referer = normalizeRequestUrl(referer);
	}
	if (isMobileApiOrigin(requestOrigin)) {
		headers.Referer = BASE_URL + '/';
	}
	return headers;
}

async function requestText(url, referer, method, headers, timeout) {
	const requestUrl = normalizeRequestUrl(url);
	return await rulia().httpRequest({
		url: requestUrl,
		method: method || 'GET',
		headers: Object.assign(requestHeaders(referer, requestUrl), headers || {}),
		timeout: timeout || REQUEST_TIMEOUT
	});
}

function withTimeout(promise, timeout, message) {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error(message || '请求超时。')), timeout);
		promise.then(value => {
			clearTimeout(timer);
			resolve(value);
		}).catch(error => {
			clearTimeout(timer);
			reject(error);
		});
	});
}

function delay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function firstResolved(promises) {
	return new Promise((resolve, reject) => {
		let pending = promises.length;
		let lastError = null;
		for (let i = 0; i < promises.length; i++) {
			promises[i].then(resolve).catch(error => {
				lastError = error;
				pending--;
				if (pending <= 0) {
					reject(lastError || new Error('所有请求均失败。'));
				}
			});
		}
	});
}

function cleanImageUrl(url) {
	const imageUrl = decodeHtml(url || '');
	if (!imageUrl || /^data:/i.test(imageUrl)) {
		return '';
	}
	return absoluteUrl(imageUrl);
}

function cleanCoverUrl(url) {
	return cleanImageUrl(url);
}

function compatibleCoverUrl(url) {
	const imageUrl = cleanImageUrl(url);
	if (!imageUrl) {
		return '';
	}
	return imageUrl.replace(/\.(jpg|jpeg|png|webp)\.328x422\.jpg(?:([?#].*)?)$/i, '.$1$2');
}

function preferCompatibleImageUrl(url) {
	const imageUrl = cleanImageUrl(url);
	if (!imageUrl) {
		return '';
	}
	return imageUrl
		.replace(/\.jpg\.h\d+x\.webp(?:([?#].*)?)$/i, '.jpg.c1500x.jpg$1')
		.replace(/\.jpeg\.h\d+x\.webp(?:([?#].*)?)$/i, '.jpeg.c1500x.jpg$1');
}

function parseFilterOptions(rawFilterOptions) {
	let options = {};
	if (!rawFilterOptions) {
		return options;
	}
	try {
		options = JSON.parse(rawFilterOptions) || {};
	} catch (_) {
		options = {};
	}
	options.theme = normalizeFilterValue(options.theme2026 || options.theme, {
		color: 'COLOR',
		c102: 'comiket102',
		c103: 'comiket103',
		c100: 'comiket100',
		c104: 'comiket104',
		c101: 'comiket101',
		c99: 'comiket99',
		c97: 'comiket97',
		c96: 'comiket96',
		c105: 'comiket105',
		c98: 'C98',
		c95: 'comiket95',
		wuxiuzheng: 'Uncensored',
		lovelive: 'loveLive'
	});
	options.region = normalizeFilterValue(options.region2026 || options.region);
	options.status = normalizeFilterValue(options.status2026 || options.status);
	options.ordering = normalizeFilterValue(options.ordering2026 || options.ordering, {
		'-datetime_updated': 'datetime_updated'
	}) || 'datetime_updated';
	return options;
}

function normalizeFilterValue(value, aliases) {
	const text = String(value == null ? '' : value).trim();
	if (!text || text === ALL_FILTER_VALUE || /^all$/i.test(text)) {
		return '';
	}
	return (aliases && aliases[text]) || text;
}

function sitePagesForRequest(page, pageSize) {
	return [Math.max(1, parseInt(page, 10) || 1)];
}

function buildListUrl(page, filterOptions) {
	return buildHtmlListUrl(page, filterOptions, BASE_URL);
}

function buildMobileListUrl(baseUrl, page, filterOptions) {
	const params = new URLSearchParams();
	const offset = (Math.max(1, parseInt(page, 10) || 1) - 1) * LIST_PAGE_SIZE;
	if (filterOptions.theme) {
		params.set('theme', filterOptions.theme);
	}
	if (filterOptions.region) {
		params.set('region', filterOptions.region);
	}
	if (filterOptions.status) {
		params.set('status', filterOptions.status);
	}
	params.set('ordering', filterOptions.ordering || 'datetime_updated');
	params.set('offset', String(offset));
	params.set('limit', String(LIST_PAGE_SIZE));
	params.set('platform', '3');
	return mobileApiUrl(baseUrl, '/api/v3/comics?' + params.toString());
}

function buildHtmlListUrl(page, filterOptions, baseUrl) {
	const params = new URLSearchParams();
	const offset = (Math.max(1, parseInt(page, 10) || 1) - 1) * LIST_PAGE_SIZE;
	if (filterOptions.theme) {
		params.set('theme', filterOptions.theme);
	}
	if (filterOptions.region) {
		params.set('region', filterOptions.region);
	}
	if (filterOptions.status) {
		params.set('status', filterOptions.status);
	}
	params.set('ordering', filterOptions.ordering || 'datetime_updated');
	params.set('offset', String(offset));
	params.set('limit', String(LIST_PAGE_SIZE));
	const query = params.toString();
	return (baseUrl || BASE_URL) + '/comics' + (query ? '?' + query : '');
}

function buildSearchUrl(page, keyword) {
	const offset = (Math.max(1, parseInt(page, 10) || 1) - 1) * LIST_PAGE_SIZE;
	return BASE_URL + '/api/kb/web/searchci/comics?offset=' + offset
		+ '&platform=2&limit=' + LIST_PAGE_SIZE
		+ '&q=' + encodeURIComponent(keyword)
		+ '&q_type=';
}

function buildMobileSearchUrl(baseUrl, page, keyword) {
	const offset = (Math.max(1, parseInt(page, 10) || 1) - 1) * LIST_PAGE_SIZE;
	return mobileApiUrl(baseUrl, '/api/v3/search/comic?offset=' + offset
		+ '&platform=3&limit=' + LIST_PAGE_SIZE
		+ '&q=' + encodeURIComponent(keyword)
		+ '&q_type=');
}

function parseMangaPath(url) {
	const match = String(url || '').match(/\/comic\/([^/?#]+)/i);
	return match ? match[1] : '';
}

function normalizeApiItem(item) {
	const pathWord = item && item.path_word;
	const authorList = item && item.author;
	const authors = Array.isArray(authorList) ? authorList.map(author => author && author.name).filter(Boolean) : [];
	if (!pathWord || !item.name) {
		return null;
	}
	return {
		title: decodeHtml(item.name),
		url: BASE_URL + '/comic/' + pathWord,
		coverUrl: cleanCoverUrl(item.cover) || FALLBACK_COVER,
		author: authors.join(' / '),
		description: item.brief || ''
	};
}

function parseApiMangaList(json) {
	const data = json && (json.results || json.data || json);
	const list = data && (Array.isArray(data.list) ? data.list : (Array.isArray(data.results) ? data.results : data));
	if (!Array.isArray(list)) {
		return { list: [] };
	}
	return { list: list.map(normalizeApiItem).filter(Boolean) };
}

function rememberMangaItems(items) {
	for (let i = 0; i < (items || []).length; i++) {
		const item = items[i];
		if (item && item.url) {
			mangaListItemCache[item.url] = item;
		}
	}
}

function parseEmbeddedList(html) {
	const container = (html || '').match(/<div\b[^>]*class=["'][^"']*\bexemptComic-box\b[^"']*["'][^>]*>/i);
	const listText = container ? attr(container[0], 'list') : '';
	const source = decodeHtml(listText);
	const result = [];
	const seen = {};
	const itemRe = /'path_word'\s*:\s*'([^']+)'[\s\S]*?'name'\s*:\s*'([^']*)'[\s\S]*?'cover'\s*:\s*'([^']*)'[\s\S]*?'author'\s*:\s*\[([\s\S]*?)\]/g;
	let match;
	while ((match = itemRe.exec(source)) !== null) {
		const pathWord = decodeHtml(match[1]);
		if (!pathWord || seen[pathWord]) {
			continue;
		}
		seen[pathWord] = true;
		const authors = [];
		match[4].replace(/'name'\s*:\s*'([^']*)'/g, (_, name) => {
			authors.push(decodeHtml(name));
			return '';
		});
		result.push({
			title: decodeHtml(match[2]),
			url: BASE_URL + '/comic/' + pathWord,
			coverUrl: cleanCoverUrl(match[3]) || FALLBACK_COVER,
			author: authors.join(' / ')
		});
	}
	return { list: result };
}

function parseHtmlMangaCards(html) {
	const result = [];
	const seen = {};
	const itemRe = /<div\b[^>]*class=["'][^"']*\bexemptComic_Item\b[^"']*["'][^>]*>([\s\S]*?)(?=<div\b[^>]*class=["'][^"']*\bexemptComic_Item\b|<\/main>|$)/gi;
	let match;
	while ((match = itemRe.exec(html || '')) !== null) {
		const block = match[1];
		const link = (block.match(/<a\b[^>]*href=["']([^"']*\/comic\/(?![^"']*\/chapter\/)[^"']+)["'][^>]*>/i) || [])[1];
		const imgHtml = (block.match(/<img\b[^>]*>/i) || [])[0] || '';
		const pathWord = parseMangaPath(link);
		if (!pathWord || seen[pathWord]) {
			continue;
		}
		const title = attr((block.match(/<p\b[^>]*title=["'][^"']*["'][^>]*>/i) || [])[0], 'title')
			|| attr(imgHtml, 'alt')
			|| stripTags((block.match(/<p\b[^>]*class=["'][^"']*\btwoLines\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i) || [])[1]);
		if (!title) {
			continue;
		}
		seen[pathWord] = true;
		result.push({
			title,
			url: BASE_URL + '/comic/' + pathWord,
			coverUrl: cleanCoverUrl(attr(imgHtml, 'data-src') || attr(imgHtml, 'src')) || FALLBACK_COVER,
			author: stripTags((block.match(/作者[:：]([\s\S]*?)<\/span>/i) || [])[1])
		});
	}
	return { list: result };
}

function parseMangaList(html) {
	const embedded = parseEmbeddedList(html);
	if (embedded.list.length) {
		return embedded;
	}
	return parseHtmlMangaCards(html);
}

function mergeListResults(results) {
	const list = [];
	const seen = {};
	for (let i = 0; i < results.length; i++) {
		const result = results[i];
		if (!result || !Array.isArray(result.list)) {
			continue;
		}
		for (let j = 0; j < result.list.length; j++) {
			const item = result.list[j];
			if (!item || !item.url || seen[item.url]) {
				continue;
			}
			seen[item.url] = true;
			list.push(item);
		}
	}
	return { list };
}

function parseTitle(html, fallback) {
	return stripTags((html.match(/<h6\b[^>]*title=["'][^"']*["'][^>]*>([\s\S]*?)<\/h6>/i) || [])[1])
		|| decodeHtml((html.match(/<h6\b[^>]*title=["']([^"']+)["']/i) || [])[1])
		|| stripTags((html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || [])[1])
		|| stripTags((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]).replace(/[-_].*$/, '')
		|| fallback
		|| '拷贝漫画';
}

function parseDescription(html) {
	const intro = stripTags((html.match(/<p\b[^>]*class=["'][^"']*\bintro\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i) || [])[1]);
	const meta = decodeHtml((html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) || [])[1]);
	return intro || meta;
}

function parseCover(html) {
	return cleanCoverUrl((html.match(/<div\b[^>]*class=["'][^"']*\bcomicParticulars-left-img\b[^"']*["'][^>]*>[\s\S]*?<img\b[^>]*(?:data-src|src)=["']([^"']+)["']/i) || [])[1])
		|| cleanCoverUrl((html.match(/<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i) || [])[1])
		|| FALLBACK_COVER;
}

function parseDnts(html) {
	return decodeHtml((html.match(/<span\b[^>]*id=["']dnt["'][^>]*value=["']([^"']+)["']/i) || [])[1]) || '3';
}

function makeChapterUrl(pathWord, chapter) {
	const uuid = chapter && (chapter.uuid || chapter.id);
	if (!pathWord || !uuid) {
		return '';
	}
	return BASE_URL + '/comic/' + pathWord + '/chapter/' + uuid;
}

function flattenChapterGroups(groups) {
	const result = [];
	const seen = {};
	if (groups && groups.default && Array.isArray(groups.default.chapters) && groups.default.chapters.length) {
		return groups.default.chapters;
	}
	for (const key in groups || {}) {
		const group = groups[key] || {};
		const chapters = Array.isArray(group.chapters) ? group.chapters : [];
		for (let i = 0; i < chapters.length; i++) {
			const chapter = chapters[i] || {};
			const uuid = chapter.uuid || chapter.id;
			if (!uuid || seen[uuid]) {
				continue;
			}
			seen[uuid] = true;
			result.push(chapter);
		}
	}
	return result;
}

function parseChapterListFromDetailJson(json, pathWord) {
	const data = json && (json.results || json);
	const build = data && data.build;
	const groups = data && (data.groups || (build && build.groups) || data.group || data);
	const chapters = Array.isArray(data && data.chapters) ? data.chapters : flattenChapterGroups(groups);
	return chapters.map(chapter => ({
		title: chapter.name || chapter.title || chapter.chapter_name || '章节',
		url: makeChapterUrl(chapter.comic_path_word || (build && build.path_word) || pathWord, chapter)
	})).filter(item => item.url);
}

function parseMobileChapterList(json, pathWord) {
	const results = json && json.results;
	const list = results && Array.isArray(results.list) ? results.list : [];
	return list.map(chapter => ({
		title: chapter.name || chapter.title || '章节',
		url: makeChapterUrl(chapter.comic_path_word || pathWord, chapter)
	})).filter(item => item.url);
}

function parseMobileMangaData(json, pathWord, chapterList) {
	const results = json && json.results;
	const comic = results && results.comic;
	if (!comic) {
		throw new Error('移动端详情为空。');
	}
	const authors = Array.isArray(comic.author) ? comic.author.map(author => author && author.name).filter(Boolean) : [];
	const tags = []
		.concat(Array.isArray(comic.theme) ? comic.theme : [])
		.concat(Array.isArray(comic.females) ? comic.females : [])
		.concat(Array.isArray(comic.males) ? comic.males : [])
		.map(item => item && item.name)
		.filter(Boolean);
	const restrict = comic.restrict && comic.restrict.display;
	const descriptionParts = [
		comic.brief,
		authors.length ? '作者：' + authors.join(' / ') : '',
		restrict ? '分级：' + restrict : '',
		tags.length ? '标签：' + tags.join(' / ') : ''
	].filter(Boolean);
	return {
		title: decodeHtml(comic.name || pathWord),
		description: decodeHtml(descriptionParts.join('\n')),
		coverUrl: cleanImageUrl(comic.cover) || FALLBACK_COVER,
		chapterList: chapterList || []
	};
}

function markFallbackChapterList(list, reason) {
	if (!Array.isArray(list)) {
		return [];
	}
	if (!reason) {
		return list;
	}
	return list.map(item => ({
		title: item.title + '（' + reason + '）',
		url: item.url
	}));
}

function placeholderChapterList(pathWord, reason) {
	const suffix = reason ? '（' + reason + '）' : '';
	return [{
		title: '开始阅读' + suffix,
		url: BASE_URL + '/comic/' + encodeURIComponent(pathWord)
	}];
}

function ensureChapterList(list, pathWord, reason) {
	if (Array.isArray(list) && list.length) {
		return list;
	}
	return placeholderChapterList(pathWord, reason);
}

function parseFallbackChapterList(html) {
	const result = [];
	const seen = {};
	const chapterRe = /<a\b[^>]*href=["']([^"']*\/comic\/[^"']+\/chapter\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
	let match;
	while ((match = chapterRe.exec(html || '')) !== null) {
		const url = absoluteUrl(match[1]);
		let title = attr(match[0], 'title') || stripTags(match[2]) || '章节';
		if (/開始|开始/.test(title)) {
			title = '开始阅读';
		}
		if (seen[url] || /上一|下一/.test(title)) {
			continue;
		}
		seen[url] = true;
		result.push({ title, url });
	}
	return result;
}

function textBytes(value) {
	const text = String(value || '');
	const bytes = new Uint8Array(text.length);
	for (let i = 0; i < text.length; i++) {
		bytes[i] = text.charCodeAt(i) & 255;
	}
	return bytes;
}

function hexBytes(value) {
	const hex = String(value || '').replace(/[^0-9a-f]/gi, '');
	const bytes = new Uint8Array(Math.floor(hex.length / 2));
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
	}
	return bytes;
}

function bytesToUtf8(bytes) {
	let binary = '';
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	try {
		return decodeURIComponent(escape(binary));
	} catch (_) {
		return binary;
	}
}

const AES_INV_SBOX = [
	0x52,0x09,0x6a,0xd5,0x30,0x36,0xa5,0x38,0xbf,0x40,0xa3,0x9e,0x81,0xf3,0xd7,0xfb,
	0x7c,0xe3,0x39,0x82,0x9b,0x2f,0xff,0x87,0x34,0x8e,0x43,0x44,0xc4,0xde,0xe9,0xcb,
	0x54,0x7b,0x94,0x32,0xa6,0xc2,0x23,0x3d,0xee,0x4c,0x95,0x0b,0x42,0xfa,0xc3,0x4e,
	0x08,0x2e,0xa1,0x66,0x28,0xd9,0x24,0xb2,0x76,0x5b,0xa2,0x49,0x6d,0x8b,0xd1,0x25,
	0x72,0xf8,0xf6,0x64,0x86,0x68,0x98,0x16,0xd4,0xa4,0x5c,0xcc,0x5d,0x65,0xb6,0x92,
	0x6c,0x70,0x48,0x50,0xfd,0xed,0xb9,0xda,0x5e,0x15,0x46,0x57,0xa7,0x8d,0x9d,0x84,
	0x90,0xd8,0xab,0x00,0x8c,0xbc,0xd3,0x0a,0xf7,0xe4,0x58,0x05,0xb8,0xb3,0x45,0x06,
	0xd0,0x2c,0x1e,0x8f,0xca,0x3f,0x0f,0x02,0xc1,0xaf,0xbd,0x03,0x01,0x13,0x8a,0x6b,
	0x3a,0x91,0x11,0x41,0x4f,0x67,0xdc,0xea,0x97,0xf2,0xcf,0xce,0xf0,0xb4,0xe6,0x73,
	0x96,0xac,0x74,0x22,0xe7,0xad,0x35,0x85,0xe2,0xf9,0x37,0xe8,0x1c,0x75,0xdf,0x6e,
	0x47,0xf1,0x1a,0x71,0x1d,0x29,0xc5,0x89,0x6f,0xb7,0x62,0x0e,0xaa,0x18,0xbe,0x1b,
	0xfc,0x56,0x3e,0x4b,0xc6,0xd2,0x79,0x20,0x9a,0xdb,0xc0,0xfe,0x78,0xcd,0x5a,0xf4,
	0x1f,0xdd,0xa8,0x33,0x88,0x07,0xc7,0x31,0xb1,0x12,0x10,0x59,0x27,0x80,0xec,0x5f,
	0x60,0x51,0x7f,0xa9,0x19,0xb5,0x4a,0x0d,0x2d,0xe5,0x7a,0x9f,0x93,0xc9,0x9c,0xef,
	0xa0,0xe0,0x3b,0x4d,0xae,0x2a,0xf5,0xb0,0xc8,0xeb,0xbb,0x3c,0x83,0x53,0x99,0x61,
	0x17,0x2b,0x04,0x7e,0xba,0x77,0xd6,0x26,0xe1,0x69,0x14,0x63,0x55,0x21,0x0c,0x7d
];

const AES_SBOX = [
	0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
	0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
	0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
	0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
	0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
	0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
	0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
	0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
	0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
	0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
	0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
	0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
	0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
	0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
	0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
	0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16
];

const AES_RCON = [0x00,0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36];

function aesMul(a, b) {
	let result = 0;
	for (let i = 0; i < 8; i++) {
		if (b & 1) {
			result ^= a;
		}
		const high = a & 0x80;
		a = (a << 1) & 0xff;
		if (high) {
			a ^= 0x1b;
		}
		b >>= 1;
	}
	return result;
}

function aesExpandKey(key) {
	const expanded = new Uint8Array(176);
	expanded.set(key);
	let bytes = 16;
	let rcon = 1;
	const temp = new Uint8Array(4);
	while (bytes < 176) {
		for (let i = 0; i < 4; i++) {
			temp[i] = expanded[bytes - 4 + i];
		}
		if (bytes % 16 === 0) {
			const first = temp[0];
			temp[0] = AES_SBOX[temp[1]] ^ AES_RCON[rcon++];
			temp[1] = AES_SBOX[temp[2]];
			temp[2] = AES_SBOX[temp[3]];
			temp[3] = AES_SBOX[first];
		}
		for (let i = 0; i < 4; i++) {
			expanded[bytes] = expanded[bytes - 16] ^ temp[i];
			bytes++;
		}
	}
	return expanded;
}

function aesAddRoundKey(state, key, round) {
	for (let i = 0; i < 16; i++) {
		state[i] ^= key[round * 16 + i];
	}
}

function aesInvSubBytes(state) {
	for (let i = 0; i < 16; i++) {
		state[i] = AES_INV_SBOX[state[i]];
	}
}

function aesInvShiftRows(state) {
	let t;
	t = state[13]; state[13] = state[9]; state[9] = state[5]; state[5] = state[1]; state[1] = t;
	t = state[2]; state[2] = state[10]; state[10] = t; t = state[6]; state[6] = state[14]; state[14] = t;
	t = state[3]; state[3] = state[7]; state[7] = state[11]; state[11] = state[15]; state[15] = t;
}

function aesInvMixColumns(state) {
	for (let c = 0; c < 4; c++) {
		const i = c * 4;
		const a0 = state[i];
		const a1 = state[i + 1];
		const a2 = state[i + 2];
		const a3 = state[i + 3];
		state[i] = aesMul(a0, 14) ^ aesMul(a1, 11) ^ aesMul(a2, 13) ^ aesMul(a3, 9);
		state[i + 1] = aesMul(a0, 9) ^ aesMul(a1, 14) ^ aesMul(a2, 11) ^ aesMul(a3, 13);
		state[i + 2] = aesMul(a0, 13) ^ aesMul(a1, 9) ^ aesMul(a2, 14) ^ aesMul(a3, 11);
		state[i + 3] = aesMul(a0, 11) ^ aesMul(a1, 13) ^ aesMul(a2, 9) ^ aesMul(a3, 14);
	}
}

function aesDecryptBlock(block, expandedKey) {
	const state = new Uint8Array(block);
	aesAddRoundKey(state, expandedKey, 10);
	for (let round = 9; round >= 1; round--) {
		aesInvShiftRows(state);
		aesInvSubBytes(state);
		aesAddRoundKey(state, expandedKey, round);
		aesInvMixColumns(state);
	}
	aesInvShiftRows(state);
	aesInvSubBytes(state);
	aesAddRoundKey(state, expandedKey, 0);
	return state;
}

function aesCbcDecryptBytes(data, key, iv) {
	if (data.length % 16 !== 0 || key.length !== 16 || iv.length !== 16) {
		throw new Error('AES 数据长度不正确。');
	}
	const expandedKey = aesExpandKey(key);
	const output = new Uint8Array(data.length);
	let previous = iv;
	for (let offset = 0; offset < data.length; offset += 16) {
		const block = data.slice(offset, offset + 16);
		const decrypted = aesDecryptBlock(block, expandedKey);
		for (let i = 0; i < 16; i++) {
			output[offset + i] = decrypted[i] ^ previous[i];
		}
		previous = block;
	}
	const pad = output[output.length - 1];
	if (pad < 1 || pad > 16) {
		return output;
	}
	return output.slice(0, output.length - pad);
}

async function aesCbcDecryptHex(payload, keyText, ivAsHex) {
	const value = String(payload || '');
	if (value.length <= 16) {
		throw new Error('章节数据为空。');
	}
	const ivPart = value.substring(0, 16);
	const dataPart = value.substring(16);
	const key = textBytes(keyText);
	const iv = ivAsHex ? hexBytes(ivPart) : textBytes(ivPart);
	if (iv.length !== 16) {
		throw new Error('章节数据 IV 长度不正确。');
	}
	const decrypted = aesCbcDecryptBytes(hexBytes(dataPart), key, iv);
	return bytesToUtf8(decrypted);
}

async function decryptDetailPayload(payload) {
	return JSON.parse(await aesCbcDecryptHex(payload, DETAIL_KEY, false));
}

async function decryptContentPayload(payload) {
	return JSON.parse(await aesCbcDecryptHex(payload, CONTENT_KEY, false));
}

function chapterListRequestForBase(baseUrl, pathWord, timeout) {
	const apiUrl = baseUrl + '/comicdetail/' + encodeURIComponent(pathWord) + '/chapters';
	return requestText(apiUrl, null, 'GET', {
		cookie: 'webp=1',
		priority: 'u=1, i'
	}, timeout);
}

function chapterListRequests(pathWord) {
	return [
		chapterListRequestForBase(BASE_URL, pathWord),
		chapterListRequestForBase(MIRROR_URL, pathWord)
	];
}

async function request2026ChapterList(pathWord) {
	const text = await chapterListRequestForBase(BASE_URL, pathWord, DETAIL_CHAPTER_TIMEOUT);
	return await parseChapterTextToList(text, pathWord);
}

async function mobileChapterListRequest(pathWord) {
	if (chapterListCache[pathWord]) {
		return chapterListCache[pathWord];
	}
	let lastError = null;
	for (let round = 0; round < MOBILE_RETRY_ROUNDS; round++) {
		for (let i = 0; i < MOBILE_API_URLS.length; i++) {
			const apiUrl = mobileApiUrl(MOBILE_API_URLS[i], '/api/v3/comic/' + encodeURIComponent(pathWord)
				+ '/group/default/chapters?limit=500&offset=0&platform=3');
			try {
				const text = await requestText(apiUrl, BASE_URL + '/comic/' + encodeURIComponent(pathWord), 'GET', {}, 15000);
				const list = parseMobileChapterList(JSON.parse(text), pathWord);
				if (list.length) {
					chapterListCache[pathWord] = list;
					return list;
				}
				lastError = new Error('移动端章节目录为空。');
			} catch (error) {
				lastError = error;
			}
		}
		if (round + 1 < MOBILE_RETRY_ROUNDS) {
			await delay(RETRY_DELAY);
		}
	}
	throw lastError || new Error('移动端章节目录为空。');
}

async function mobileJsonRequest(pathBuilder, referer, timeout) {
	let lastError = null;
	for (let round = 0; round < MOBILE_RETRY_ROUNDS; round++) {
		for (let i = 0; i < MOBILE_API_URLS.length; i++) {
			try {
				const text = await requestText(pathBuilder(MOBILE_API_URLS[i]), referer, 'GET', {}, timeout || 15000);
				return JSON.parse(text);
			} catch (error) {
				lastError = error;
			}
		}
		if (round + 1 < MOBILE_RETRY_ROUNDS) {
			await delay(RETRY_DELAY);
		}
	}
	throw lastError || new Error('移动端接口请求失败。');
}

async function mobileMangaDataRequest(pathWord) {
	return await mobileJsonRequest(
		baseUrl => mobileApiUrl(baseUrl, '/api/v3/comic/' + encodeURIComponent(pathWord) + '?platform=3'),
		BASE_URL + '/comic/' + encodeURIComponent(pathWord),
		15000
	);
}

async function parseChapterTextToList(text, pathWord) {
	const response = JSON.parse(text);
	const encrypted = response && response.results;
	if (!encrypted) {
		throw new Error('章节目录接口没有返回结果。');
	}
	const json = await decryptDetailPayload(encrypted);
	const list = parseChapterListFromDetailJson(json, pathWord);
	if (!list.length) {
		throw new Error('章节目录为空。');
	}
	return list;
}

async function firstValidChapterList(promises, pathWord) {
	return new Promise((resolve, reject) => {
		let pending = promises.length;
		let lastError = null;
		for (let i = 0; i < promises.length; i++) {
			promises[i]
				.then(text => parseChapterTextToList(text, pathWord))
				.then(resolve)
				.catch(error => {
					lastError = error;
					pending--;
					if (pending <= 0) {
						reject(lastError || new Error('章节目录接口均失败。'));
					}
				});
		}
	});
}

async function loadChapterList(pathWord, detailHtml, chapterTextPromises, skipMobile) {
	if (!chapterTextPromises) {
		try {
			const webList = await withTimeout(
				chapterListRequestForBase(BASE_URL, pathWord, DETAIL_CHAPTER_TIMEOUT)
					.then(text => parseChapterTextToList(text, pathWord)),
				DETAIL_CHAPTER_TIMEOUT,
				'章节目录接口响应超时。'
			);
			if (webList.length) {
				chapterListCache[pathWord] = webList;
				return webList;
			}
		} catch (_) {}
		if (!skipMobile) {
			try {
				return await mobileChapterListRequest(pathWord);
			} catch (_) {}
		}
		try {
			const mirrorList = await withTimeout(
				chapterListRequestForBase(MIRROR_URL, pathWord, CHAPTER_LIST_TIMEOUT)
					.then(text => parseChapterTextToList(text, pathWord)),
				CHAPTER_LIST_TIMEOUT,
				'章节目录备用接口响应超时。'
			);
			if (mirrorList.length) {
				chapterListCache[pathWord] = mirrorList;
				return mirrorList;
			}
		} catch (_) {}
	}
	try {
		const requests = chapterTextPromises || chapterListRequests(pathWord);
		const list = await withTimeout(firstValidChapterList(requests, pathWord), skipMobile ? DETAIL_CHAPTER_TIMEOUT : CHAPTER_LIST_TIMEOUT, '章节目录接口响应超时。');
		if (list.length) {
			chapterListCache[pathWord] = list;
		}
		return list;
	} catch (_) {}
	throw new Error('无法解析章节目录。');
}

function parseContentKey(html) {
	return (html.match(/contentKey\s*=\s*'([^']+)'/i) || [])[1] || '';
}

function normalizeImageItems(items) {
	if (!Array.isArray(items)) {
		return [];
	}
	return items.map(item => {
		const imageUrl = cleanImageUrl(item && (item.url || item.src || item.path || item.image));
		return {
			url: imageUrl,
			width: Number(item && item.width) || DEFAULT_IMAGE_WIDTH,
			height: Number(item && item.height) || DEFAULT_IMAGE_HEIGHT
		};
	}).filter(item => item.url);
}

function parseChapterParts(chapterUrl) {
	const match = String(chapterUrl || '').match(/\/comic\/([^/?#]+)\/chapter\/([^/?#]+)/i);
	return match ? {
		pathWord: decodeURIComponent(match[1]),
		chapterId: decodeURIComponent(match[2])
	} : null;
}

function chapterReadUrls(chapterUrl) {
	const parts = parseChapterParts(chapterUrl);
	if (!parts) {
		return [normalizeRequestUrl(chapterUrl)];
	}
	const path = '/comic/' + encodeURIComponent(parts.pathWord) + '/chapter/' + encodeURIComponent(parts.chapterId);
	return [
		BASE_URL + path,
		MIRROR_URL + path
	];
}

async function requestChapterReadHtml(url) {
	return await requestText(url, url, 'GET', {
		Cookie: 'webp=1'
	}, 15000);
}

async function requestMobileChapterImages(chapterUrl) {
	const parts = parseChapterParts(chapterUrl);
	if (!parts) {
		return [];
	}
	let lastError = null;
	for (let round = 0; round < MOBILE_RETRY_ROUNDS; round++) {
		for (let i = 0; i < MOBILE_API_URLS.length; i++) {
			const apiUrl = mobileApiUrl(MOBILE_API_URLS[i], '/api/v3/comic/' + encodeURIComponent(parts.pathWord)
				+ '/chapter/' + encodeURIComponent(parts.chapterId) + '?platform=3');
			try {
				const text = await requestText(apiUrl, chapterUrl, 'GET', {}, 15000);
				const json = JSON.parse(text);
				const results = json && json.results;
				const chapter = results && results.chapter;
				const images = normalizeImageItems(chapter && chapter.contents);
				if (images.length) {
					return images;
				}
				lastError = new Error('移动端章节图片为空。');
			} catch (error) {
				lastError = error;
			}
		}
		if (round + 1 < MOBILE_RETRY_ROUNDS) {
			await delay(RETRY_DELAY);
		}
	}
	throw lastError || new Error('移动端章节图片为空。');
}

async function resolveChapterUrl(chapterUrl) {
	const normalized = normalizeRequestUrl(chapterUrl);
	if (parseChapterParts(normalized)) {
		return normalized;
	}
	const pathWord = parseMangaPath(normalized);
	if (!pathWord) {
		return normalized;
	}
	try {
		const html = await requestMangaDetailHtml(normalized, pathWord);
		const fallback = parseFallbackChapterList(html);
		if (fallback.length && fallback[0].url) {
			return fallback[0].url;
		}
	} catch (_) {
		return normalized;
	}
	return normalized;
}

async function requestMangaDetailHtml(mangaUrl, pathWord) {
	let lastError = null;
	const primaryUrl = mangaUrl ? normalizeRequestUrl(mangaUrl) : BASE_URL + '/comic/' + encodeURIComponent(pathWord);
	const urls = [
		primaryUrl,
		BASE_URL + '/comic/' + encodeURIComponent(pathWord),
		MIRROR_URL + '/comic/' + encodeURIComponent(pathWord)
	];
	const seen = {};
	for (let round = 0; round < 2; round++) {
		for (let i = 0; i < urls.length; i++) {
			const url = urls[i];
			if (!url || (round === 0 && seen[url])) {
				continue;
			}
			seen[url] = true;
			try {
				return await withTimeout(
					requestText(url, BASE_URL + '/comics', 'GET', { Cookie: 'webp=1' }, 9000),
					9500,
					'详情页请求超时。'
				);
			} catch (error) {
				lastError = error;
			}
		}
		await delay(RETRY_DELAY);
	}
	throw lastError || new Error('详情页请求失败。');
}

async function setMangaListFilterOptions() {
	finish([
		{ label: '题材', name: 'theme2026', options: THEMES },
		{ label: '地区', name: 'region2026', options: REGIONS },
		{ label: '状态', name: 'status2026', options: STATUSES },
		{ label: '排序', name: 'ordering2026', options: ORDERINGS }
	]);
}

async function getMangaList(page, pageSize, keyword, rawFilterOptions) {
	try {
		const filterOptions = parseFilterOptions(rawFilterOptions);
		const pages = sitePagesForRequest(page, pageSize);
		const results = [];
		for (let i = 0; i < pages.length; i++) {
			const listPage = pages[i];
			let parsed;
			if (keyword) {
				const text = await requestText(buildSearchUrl(listPage, keyword), BASE_URL + '/search?q=' + encodeURIComponent(keyword), 'GET', {}, 8000);
				parsed = parseApiMangaList(JSON.parse(text));
			} else {
				const html = await requestText(buildListUrl(listPage, filterOptions), BASE_URL + '/comics', 'GET', {}, 8000);
				parsed = parseMangaList(html);
			}
			if (!parsed.list.length) {
				break;
			}
			rememberMangaItems(parsed.list);
			results.push(parsed);
		}
		finish(mergeListResults(results));
	} catch (error) {
		fail(error);
	}
}

async function getMangaData(dataPageUrl) {
	try {
		const mangaUrl = normalizeRequestUrl(dataPageUrl);
		if (mangaDataCache[mangaUrl]) {
			finish(mangaDataCache[mangaUrl]);
			return;
		}
		const pathWord = parseMangaPath(mangaUrl);
		if (!pathWord) {
			throw new Error('无法解析漫画地址。');
		}
		let chapterList = [];
		let html = '';
		let chapterListError = null;
		try {
			html = await requestMangaDetailHtml(mangaUrl, pathWord);
		} catch (error) {
			const cached = mangaListItemCache[mangaUrl] || {};
			try {
				chapterList = await mobileChapterListRequest(pathWord);
			} catch (chapterError) {
				chapterListError = chapterError;
			}
			try {
				const detailJson = await mobileMangaDataRequest(pathWord);
				const result = parseMobileMangaData(
					detailJson,
					pathWord,
					ensureChapterList(chapterList, pathWord, chapterListError ? '章节接口返回空目录' : '')
				);
				mangaDataCache[mangaUrl] = result;
				finish(result);
				return;
			} catch (_) {}
			const result = {
				title: cached.title || pathWord,
				description: cached.description || '',
				coverUrl: cached.coverUrl || FALLBACK_COVER,
				chapterList: ensureChapterList(chapterList, pathWord, '详情页请求失败')
			};
			mangaDataCache[mangaUrl] = result;
			finish(result);
			return;
		}
		try {
			chapterList = await withTimeout(
				mobileChapterListRequest(pathWord),
				DETAIL_CHAPTER_TIMEOUT,
				'章节目录接口响应超时。'
			);
		} catch (error) {
			chapterListError = error;
		}
		if (!chapterList.length) {
			try {
				chapterList = await withTimeout(
					request2026ChapterList(pathWord),
					DETAIL_CHAPTER_TIMEOUT,
					'网页章节目录接口响应超时。'
				);
			} catch (error) {
				chapterListError = error;
			}
		}
		if (!chapterList.length) {
			chapterList = parseFallbackChapterList(html);
			if (chapterList.length && chapterListError) {
				chapterList = markFallbackChapterList(chapterList, '目录接口失败：' + (chapterListError.message || String(chapterListError)));
			}
		}
		chapterList = ensureChapterList(chapterList, pathWord, '章节接口返回空目录');
		const result = {
			title: parseTitle(html, pathWord),
			description: parseDescription(html),
			coverUrl: parseCover(html),
			chapterList
		};
		mangaDataCache[mangaUrl] = result;
		finish(result);
	} catch (error) {
		fail(error);
	}
}

async function getChapterImageList(chapterUrl) {
	try {
		const normalizedChapterUrl = await resolveChapterUrl(chapterUrl);
		if (chapterImageCache[normalizedChapterUrl]) {
			finish(chapterImageCache[normalizedChapterUrl]);
			return;
		}
		const urls = chapterReadUrls(normalizedChapterUrl);
		let encrypted = '';
		for (let i = 0; i < urls.length; i++) {
			try {
				const html = await requestChapterReadHtml(urls[i]);
				encrypted = parseContentKey(html);
				if (encrypted) {
					break;
				}
			} catch (_) {}
		}
		if (!encrypted) {
			try {
				const mobileImages = await requestMobileChapterImages(normalizedChapterUrl);
				chapterImageCache[normalizedChapterUrl] = mobileImages;
				finish(mobileImages);
				return;
			} catch (_) {}
			throw new Error('站点返回空阅读页，contentKey 为空，无法解析章节图片参数。');
		}
		const images = normalizeImageItems(await decryptContentPayload(encrypted));
		if (!images.length) {
			throw new Error('无法解析章节图片。');
		}
		chapterImageCache[normalizedChapterUrl] = images;
		finish(images);
	} catch (error) {
		fail(error);
	}
}

async function getImageUrl(path) {
	if (/\/cover\//i.test(String(path || ''))) {
		finish(compatibleCoverUrl(path) || cleanCoverUrl(path) || path);
		return;
	}
	finish(path);
}
