const BASE_URL = 'https://www.kanman.com';
const FALLBACK_COVER = 'https://resource.mhxk.com/kanman_pc/static/images/favicon.ico';
const DEFAULT_IMAGE_WIDTH = 800;
const DEFAULT_IMAGE_HEIGHT = 1200;
const SITE_PAGE_SIZE = 40;
const REQUEST_TIMEOUT = 15000;

const mangaDataCache = {};
const chapterImageCache = {};

const CATEGORIES = [
	{ label: '全部', value: 'index' },
	{ label: '热血', value: 'rexue' },
	{ label: '机战', value: 'jizhan' },
	{ label: '运动', value: 'yundong' },
	{ label: '推理', value: 'tuili' },
	{ label: '冒险', value: 'maoxian' },
	{ label: '搞笑', value: 'gaoxiao' },
	{ label: '战争', value: 'zhanzheng' },
	{ label: '神魔', value: 'shenmo' },
	{ label: '忍者', value: 'renzhe' },
	{ label: '竞技', value: 'jingji' },
	{ label: '悬疑', value: 'xuanyi' },
	{ label: '社会', value: 'shehui' },
	{ label: '恋爱', value: 'lianai' },
	{ label: '宠物', value: 'chongwu' },
	{ label: '吸血', value: 'xixue' },
	{ label: '萝莉', value: 'luoli' },
	{ label: '御姐', value: 'yujie' },
	{ label: '霸总', value: 'bazong' },
	{ label: '玄幻', value: 'xuanhuan' },
	{ label: '古风', value: 'gufeng' },
	{ label: '历史', value: 'lishi' },
	{ label: '漫改', value: 'mangai' },
	{ label: '游戏', value: 'youxi' },
	{ label: '穿越', value: 'chuanyue' },
	{ label: '恐怖', value: 'kongbu' },
	{ label: '真人', value: 'zhenren' },
	{ label: '科幻', value: 'kehuan' },
	{ label: '都市', value: 'dushi' },
	{ label: '武侠', value: 'wuxia' },
	{ label: '修真', value: 'xiuzhen' },
	{ label: '生活', value: 'shenghuo' },
	{ label: '动作', value: 'dongzuo' }
];

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

function requestHeaders(referer) {
	return {
		Referer: referer ? normalizeRequestUrl(referer) : BASE_URL + '/',
		'User-Agent': 'Mozilla/5.0'
	};
}

function apiRequestHeaders(referer) {
	const headers = requestHeaders(referer);
	headers['X-Requested-With'] = 'XMLHttpRequest';
	return headers;
}

async function requestText(url, referer, api) {
	return await window.Rulia.httpRequest({
		url: normalizeRequestUrl(url),
		method: 'GET',
		headers: api ? apiRequestHeaders(referer) : requestHeaders(referer),
		timeout: REQUEST_TIMEOUT
	});
}

async function requestJson(url, referer) {
	const text = await requestText(url, referer, true);
	return JSON.parse(text);
}

function isNotFoundError(error) {
	return /\b404\b|not\s*found/i.test(String(error && error.message || error || ''));
}

function cleanImageUrl(url) {
	const imageUrl = decodeHtml(url || '');
	if (!imageUrl || /space\.gif/i.test(imageUrl)) {
		return '';
	}
	return absoluteUrl(imageUrl.replace(/^\/\//, 'https://')).replace(/^http:\/\//i, 'https://');
}

function mangaUrl(comicId) {
	return BASE_URL + '/' + comicId + '/';
}

function parseComicId(url) {
	return (String(url || '').match(/\/(\d+)\/?$/) || [])[1]
		|| (String(url || '').match(/\/(\d+)\/[^/?#]+\.html/i) || [])[1]
		|| '';
}

function makeChapterPayload(comicId, chapterNewId, chapterId) {
	const params = new URLSearchParams();
	params.set('m', String(comicId || ''));
	params.set('n', String(chapterNewId || ''));
	if (chapterId) {
		params.set('id', String(chapterId));
	}
	return 'kanman://' + params.toString();
}

function parseChapterPayload(chapterUrl) {
	const text = String(chapterUrl || '');
	if (text.indexOf('kanman://') === 0) {
		const params = new URLSearchParams(text.replace(/^kanman:\/\//, ''));
		return {
			comicId: params.get('m') || '',
			chapterNewId: params.get('n') || '',
			chapterId: params.get('id') || ''
		};
	}
	const comicId = parseComicId(text);
	return {
		comicId,
		chapterNewId: (text.match(/\/\d+\/([^/?#]+)\.html/i) || [])[1] || '',
		chapterId: ''
	};
}

function apiItemToManga(item) {
	const title = decodeHtml(item.comic_name || '');
	const latest = decodeHtml(item.last_chapter_name || '');
	return {
		title: latest ? title + ' - ' + latest : title,
		url: mangaUrl(item.comic_id),
		coverUrl: cleanImageUrl(item.cover_img) || FALLBACK_COVER
	};
}

function parseMangaList(html) {
	const result = [];
	const seen = {};
	const itemRe = /<li\b[^>]*class=["'][^"']*\bacgn-item\b[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi;
	let match;
	while ((match = itemRe.exec(html || '')) !== null) {
		const block = match[1];
		const link = block.match(/<a\b[^>]*href=["'](\/\d+\/)["'][^>]*>([\s\S]*?)<\/a>/i);
		if (!link) {
			continue;
		}
		const url = absoluteUrl(link[1]);
		if (seen[url]) {
			continue;
		}
		const imgHtml = (block.match(/<img\b[^>]*>/i) || [])[0] || '';
		const titleLink = block.match(/<h3\b[^>]*class=["'][^"']*\bacgn-title\b[^"']*["'][^>]*>[\s\S]*?<a\b[^>]*>([\s\S]*?)<\/a>/i);
		const title = stripTags((titleLink || [])[1]) || attr(link[0], 'title').split(',')[0] || attr(imgHtml, 'alt').split(',')[0];
		if (!title) {
			continue;
		}
		const latest = stripTags((block.match(/<a\b[^>]*class=["'][^"']*\blatest-cartoon\b[^"']*["'][^>]*>([\s\S]*?)<\/a>/i) || [])[1]);
		seen[url] = true;
		result.push({
			title: latest ? title + ' - ' + latest : title,
			url,
			coverUrl: cleanImageUrl(attr(imgHtml, 'data-src') || attr(imgHtml, 'src')) || FALLBACK_COVER
		});
	}
	return { list: result };
}

function buildListUrl(page, filterOptions) {
	const category = filterOptions.category || 'index';
	if (category === 'index') {
		return page > 1 ? BASE_URL + '/sort/index_p' + page + '.html' : BASE_URL + '/sort/';
	}
	return page > 1 ? BASE_URL + '/sort/' + category + '_p' + page + '.html' : BASE_URL + '/sort/' + category + '.html';
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

function sitePagesForRequest(page, pageSize) {
	const requestedSize = parseInt(pageSize, 10) || SITE_PAGE_SIZE;
	const count = Math.max(1, Math.ceil(requestedSize / SITE_PAGE_SIZE));
	const start = (Math.max(1, parseInt(page, 10) || 1) - 1) * count + 1;
	const pages = [];
	for (let i = 0; i < count; i++) {
		pages.push(start + i);
	}
	return pages;
}

async function requestListPage(sourcePage, filterOptions) {
	try {
		return await requestText(buildListUrl(sourcePage, filterOptions));
	} catch (error) {
		if (isNotFoundError(error)) {
			return '';
		}
		throw error;
	}
}

async function collectMangaList(page, pageSize, filterOptions) {
	const size = Number(pageSize) > 0 ? Number(pageSize) : 30;
	const pageNo = Math.max(1, Number(page) || 1);
	const start = (pageNo - 1) * size;
	const required = start + size;
	const sourcePageLimit = Math.max(1, Math.ceil(required / SITE_PAGE_SIZE));
	const collected = [];
	const seen = {};

	for (let sourcePage = 1; sourcePage <= sourcePageLimit && collected.length < required; sourcePage++) {
		const html = await requestListPage(sourcePage, filterOptions);
		if (!html) {
			break;
		}
		const parsed = parseMangaList(html);
		if (!parsed.list.length) {
			break;
		}
		for (let i = 0; i < parsed.list.length; i++) {
			const item = parsed.list[i];
			if (item && item.url && !seen[item.url]) {
				seen[item.url] = true;
				collected.push(item);
			}
		}
	}

	return { list: collected.slice(start, start + size) };
}

function buildSearchUrl(page, pageSize, keyword) {
	const params = new URLSearchParams();
	params.set('pageno', String(page || 1));
	params.set('pagesize', String(Number(pageSize) > 0 ? Number(pageSize) : 30));
	params.set('search_key', keyword);
	params.set('sortby', 'anim_renqi');
	return BASE_URL + '/api/getsortlist/?' + params.toString();
}

function parseFilterOptions(rawFilterOptions) {
	if (!rawFilterOptions) {
		return {};
	}
	try {
		return JSON.parse(rawFilterOptions) || {};
	} catch (_) {
		return {};
	}
}

function parseTitle(html, fallback) {
	return stripTags((html.match(/<h1\b[^>]*class=["'][^"']*\btitle\b[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i) || [])[1])
		|| decodeHtml((html.match(/window\.shareConf\s*=\s*\{[\s\S]*?title\s*:\s*["']([^"']*)["']/i) || [])[1]).replace(/^上看漫画，《|》.*$/g, '')
		|| stripTags((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]).replace(/\s*漫画.*$/, '')
		|| fallback
		|| '看漫画';
}

function parseDescription(html) {
	const desc = stripTags((html.match(/<div\b[^>]*class=["'][^"']*\bdesc\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) || [])[1])
		|| decodeHtml((html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) || [])[1]);
	const author = stripTags((html.match(/作者[：:\s]*<\/?[^>]*>\s*([^<]+)/i) || [])[1]);
	return [author ? '作者：' + author : '', desc].filter(Boolean).join(' · ');
}

function parseCover(html) {
	return cleanImageUrl((html.match(/<meta\b[^>]*itemprop=["']image["'][^>]*content=["']([^"']*)["']/i) || [])[1])
		|| cleanImageUrl((html.match(/window\.shareConf\s*=\s*\{[\s\S]*?images\s*:\s*\[\s*["']([^"']+)["']/i) || [])[1])
		|| FALLBACK_COVER;
}

function isDetailPage(html) {
	return /window\.PAGE_TYPE\s*=\s*["']detail["']/i.test(html || '') || /<h1\b[^>]*class=["'][^"']*\btitle\b/i.test(html || '');
}

function parseChapterList(html, mangaUrlValue) {
	const result = [];
	const seen = {};
	const comicPath = parseComicId(mangaUrlValue);
	if (!comicPath) {
		return result;
	}
	const chapterRe = new RegExp('<a\\b[^>]*href=["\'](/' + comicPath + '/[^"\']+\\.html)["\'][^>]*>([\\s\\S]*?)<\\/a>', 'gi');
	let match;
	while ((match = chapterRe.exec(html || '')) !== null) {
		const url = absoluteUrl(match[1]);
		if (seen[url] || /\blast-update\b/i.test(match[0])) {
			continue;
		}
		const title = attr(match[0], 'title') || stripTags((match[2].match(/<p\b[^>]*class=["'][^"']*\bname\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i) || [])[1]) || stripTags(match[2]);
		if (!title || /最新|上一|下一/.test(title)) {
			continue;
		}
		seen[url] = true;
		result.push({
			title,
			url: makeChapterPayload(comicPath, (match[1].match(/\/\d+\/([^/]+)\.html/i) || [])[1], '')
		});
	}
	return result;
}

function parseApiChapterList(json, comicId) {
	const rows = Array.isArray(json && json.data) ? json.data : [];
	return rows
		.slice()
		.sort((a, b) => (Number(a.order_num) || 0) - (Number(b.order_num) || 0))
		.map(item => ({
			title: decodeHtml(item.chapter_name || '章节'),
			url: makeChapterPayload(comicId, item.chapter_newid, item.chapter_id)
		}))
		.filter(item => item.title && item.url.indexOf('n=') > 0);
}

function parseChapterImages(html) {
	const arrayText = (html.match(/chapter_img_list\s*:\s*(\[[\s\S]*?\])/i) || [])[1];
	if (!arrayText) {
		if (/charge_status\s*:\s*["'](?!1000)/i.test(html) || /payChapter|vipChapter/i.test(html)) {
			throw new Error('该章节可能需要站点授权或购买后阅读。');
		}
		throw new Error('无法解析章节图片。');
	}
	const images = JSON.parse(arrayText);
	if (!Array.isArray(images) || !images.length) {
		throw new Error('无法解析章节图片。');
	}
	return images.map(url => ({
		url: cleanImageUrl(url),
		width: DEFAULT_IMAGE_WIDTH,
		height: DEFAULT_IMAGE_HEIGHT
	})).filter(item => item.url);
}

function parseChapterInfoImages(json) {
	const chapter = json && json.data && json.data.current_chapter;
	const images = chapter && chapter.chapter_img_list;
	if (!Array.isArray(images) || !images.length) {
		throw new Error('无法解析章节图片。');
	}
	return images.map(url => ({
		url: cleanImageUrl(url),
		width: DEFAULT_IMAGE_WIDTH,
		height: DEFAULT_IMAGE_HEIGHT
	})).filter(item => item.url);
}

function buildChapterInfoUrl(payload) {
	const params = new URLSearchParams();
	params.set('comic_id', payload.comicId);
	params.set('chapter_newid', payload.chapterNewId);
	params.set('isWebp', '1');
	params.set('quality', 'high');
	return BASE_URL + '/api/getchapterinfov2?' + params.toString();
}

function buildChapterListApiUrl(comicId) {
	return BASE_URL + '/api/getchapterlist/?comic_id=' + encodeURIComponent(comicId);
}

async function setMangaListFilterOptions() {
	window.Rulia.endWithResult([
		{ label: '题材', name: 'category', options: CATEGORIES }
	]);
}

async function getMangaList(page, pageSize, keyword, rawFilterOptions) {
	try {
		if (keyword) {
			const json = await requestJson(buildSearchUrl(page, pageSize, keyword));
			const list = Array.isArray(json.data) ? json.data : (json.data && Array.isArray(json.data.data) ? json.data.data : []);
			window.Rulia.endWithResult({ list: list.map(apiItemToManga).filter(item => item.title) });
			return;
		}
		const filterOptions = parseFilterOptions(rawFilterOptions);
		window.Rulia.endWithResult(await collectMangaList(page, pageSize, filterOptions));
	} catch (error) {
		window.Rulia.endWithException(error.message);
	}
}

async function getMangaData(dataPageUrl) {
	try {
		const url = normalizeRequestUrl(dataPageUrl);
		if (mangaDataCache[url]) {
			window.Rulia.endWithResult(mangaDataCache[url]);
			return;
		}
		const comicId = parseComicId(url);
		const html = await requestText(url);
		const htmlChapterList = parseChapterList(html, url);
		let apiChapterList = [];
		if (comicId) {
			try {
				apiChapterList = parseApiChapterList(await requestJson(buildChapterListApiUrl(comicId), url), comicId);
			} catch (_) {}
		}
		const chapterList = htmlChapterList.length >= apiChapterList.length ? htmlChapterList : apiChapterList;
		if (!chapterList.length) {
			throw new Error('无法解析章节目录。');
		}
		let title = parseTitle(html);
		let apiComicName = '';
		if (!isDetailPage(html) || !title) {
			try {
				const firstPayload = parseChapterPayload(chapterList[0].url);
				const chapterInfo = await requestJson(buildChapterInfoUrl(firstPayload), url);
				apiComicName = decodeHtml(chapterInfo && chapterInfo.data && chapterInfo.data.comic_name);
				title = apiComicName || title;
			} catch (_) {}
		}
		const result = {
			title: title || '看漫画',
			description: parseDescription(html),
			coverUrl: isDetailPage(html) ? parseCover(html) : (comicId ? 'https://image.yqmh.com/mh/' + comicId + '.jpg' : parseCover(html)),
			chapterList
		};
		mangaDataCache[url] = result;
		window.Rulia.endWithResult(result);
	} catch (error) {
		window.Rulia.endWithException(error.message);
	}
}

async function getChapterImageList(chapterUrl) {
	try {
		const payload = parseChapterPayload(chapterUrl);
		const cacheKey = payload.comicId && payload.chapterNewId ? payload.comicId + '/' + payload.chapterNewId : normalizeRequestUrl(chapterUrl);
		if (chapterImageCache[cacheKey]) {
			window.Rulia.endWithResult(chapterImageCache[cacheKey]);
			return;
		}
		let result = [];
		if (payload.comicId && payload.chapterNewId) {
			result = parseChapterInfoImages(await requestJson(buildChapterInfoUrl(payload), mangaUrl(payload.comicId)));
		} else {
			const url = normalizeRequestUrl(chapterUrl);
			const html = await requestText(url, url);
			result = parseChapterImages(html);
		}
		chapterImageCache[cacheKey] = result;
		window.Rulia.endWithResult(result);
	} catch (error) {
		window.Rulia.endWithException(error.message);
	}
}

async function getImageUrl(path) {
	window.Rulia.endWithResult(path);
}
