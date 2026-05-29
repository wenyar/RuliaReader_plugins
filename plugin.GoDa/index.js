const BASE_URL = 'https://godamh.com';
const API_URL = 'https://api-get-v3.mgsearcher.com';
const FALLBACK_COVER = BASE_URL + '/assets/images/Logo.png';
const DEFAULT_IMAGE_WIDTH = 800;
const DEFAULT_IMAGE_HEIGHT = 1200;
const SITE_PAGE_SIZE = 24;
const REQUEST_TIMEOUT = 15000;

const mangaDataCache = {};
const chapterListCache = {};
const chapterImageCache = {};

const CATEGORIES = [
	{ label: '全部', value: '' },
	{ label: '国漫', value: 'genre/cn' },
	{ label: '韩漫', value: 'genre/kr' },
	{ label: '日漫', value: 'genre/jp' },
	{ label: '复仇', value: 'tag/fuchou' },
	{ label: '古风', value: 'tag/gufeng' },
	{ label: '奇幻', value: 'tag/qihuan' },
	{ label: '逆袭', value: 'tag/nixi' },
	{ label: '恋爱', value: 'tag/lianai' },
	{ label: '异能', value: 'tag/yineng' },
	{ label: '穿越', value: 'tag/chuanyue' },
	{ label: '热血', value: 'tag/rexue' },
	{ label: '系统', value: 'tag/xitong' },
	{ label: '重生', value: 'tag/chongsheng' },
	{ label: '玄幻', value: 'tag/xuanhuan' },
	{ label: '都市', value: 'tag/dushi' },
	{ label: '悬疑', value: 'tag/xuanyi' },
	{ label: '修仙', value: 'tag/xiuxian' }
];

const SORTS = [
	{ label: '全部漫画', value: 'manga' },
	{ label: '人气推荐', value: 'hots' },
	{ label: '热门更新', value: 'dayup' },
	{ label: '最新上架', value: 'newss' }
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
		nbsp: ' '
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
		.replace(/<[^>]+>/g, ' '));
}

function attr(html, name) {
	const match = (html || '').match(new RegExp('\\s' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i'));
	return decodeHtml((match && (match[1] || match[2] || match[3])) || '');
}

function normalizeRequestUrl(value, base) {
	const rawUrl = typeof value === 'string' ? value : (value && (value.url || value.href)) || '';
	const url = absoluteUrl(rawUrl, base);
	if (!/^https?:\/\//i.test(url)) {
		throw new Error('Invalid request URL: ' + rawUrl);
	}
	return url;
}

function requestHeaders(referer) {
	return {
		Referer: referer ? normalizeRequestUrl(referer) : BASE_URL + '/',
		Origin: BASE_URL,
		'User-Agent': 'Mozilla/5.0'
	};
}

async function requestText(url, referer) {
	return await window.Rulia.httpRequest({
		url: normalizeRequestUrl(url),
		method: 'GET',
		headers: requestHeaders(referer),
		timeout: REQUEST_TIMEOUT
	});
}

async function requestJson(url, referer) {
	const text = await requestText(url, referer || BASE_URL + '/');
	return JSON.parse(text);
}

function unwrapProxiedImage(url) {
	if (!url) {
		return '';
	}
	const decoded = decodeHtml(url);
	const match = decoded.match(/[?&]url=([^&]+)/);
	if (match) {
		try {
			return decodeURIComponent(match[1]);
		} catch (_) {
			return match[1].replace(/%3A/gi, ':').replace(/%2F/gi, '/');
		}
	}
	return absoluteUrl(decoded);
}

function thumbnailImage(url) {
	if (!url) {
		return '';
	}
	const imageUrl = absoluteUrl(decodeHtml(url));
	if (/pro-api\.mgsearcher\.com\/_next\/image/i.test(imageUrl)) {
		return imageUrl;
	}
	return unwrapProxiedImage(imageUrl);
}

function parseMangaSlug(url) {
	const match = String(url || '').match(/\/manga\/([^/?#]+)/i);
	return match ? match[1] : '';
}

function makeChapterPayload(data) {
	const params = new URLSearchParams();
	if (data.mangaUrl) {
		params.set('mu', data.mangaUrl);
	}
	if (data.chapterPageUrl) {
		params.set('cu', data.chapterPageUrl);
	}
	if (data.mid) {
		params.set('m', data.mid);
	}
	if (data.cid) {
		params.set('c', data.cid);
	}
	if (data.slug) {
		params.set('s', data.slug);
	}
	return 'goda://' + params.toString();
}

function parseMangaList(html) {
	const result = [];
	const seen = {};
	const itemRe = /<div\b[^>]*class=["'][^"']*\bpb-2\b[^"']*["'][^>]*>\s*<a\b[^>]*href=["']([^"']*\/manga\/(?!page\/)[^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/div>/gi;
	let match;
	while ((match = itemRe.exec(html)) !== null) {
		const block = match[2];
		const url = absoluteUrl(match[1]);
		const slug = parseMangaSlug(url);
		if (!slug || seen[url]) {
			continue;
		}
		const imgHtml = (block.match(/<img\b[^>]*>/i) || [])[0] || '';
		const title = stripTags((block.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i) || [])[1]) || attr(imgHtml, 'alt') || slug;
		const coverUrl = thumbnailImage(attr(imgHtml, 'src') || attr(imgHtml, 'data-src')) || FALLBACK_COVER;
		seen[url] = true;
		result.push({ title, url, coverUrl });
	}
	return { list: result };
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

function buildListUrl(page, filterOptions) {
	const sort = filterOptions.sort || 'manga';
	const category = filterOptions.category || '';
	let path = sort;
	if (sort === 'manga' && category) {
		const parts = category.split('/');
		path = parts[0] === 'genre' ? 'manga-genre/' + parts[1] : 'manga-tag/' + parts[1];
	}
	return BASE_URL + '/' + path.replace(/^\/+|\/+$/g, '') + '/page/' + page;
}

function buildSearchUrl(page, keyword) {
	return BASE_URL + '/s/' + encodeURIComponent(keyword) + '?page=' + page;
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

function extractMid(html) {
	const mid = attr((html.match(/<[^>]+id=["']mangachapters["'][^>]*>/i) || [])[0], 'data-mid')
		|| attr((html.match(/<button[^>]+data-mid=["'][^"']+["'][^>]*>/i) || [])[0], 'data-mid')
		|| attr((html.match(/<[^>]+id=["']bookmarkData["'][^>]*>/i) || [])[0], 'data-mid');
	if (!mid) {
		throw new Error('无法解析漫画 ID。');
	}
	return mid;
}

function parseTitle(html, fallback) {
	return stripTags((html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || [])[1])
		|| decodeHtml((html.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i) || [])[1] || '').replace(/\s*-\s*G站漫畫.*$/, '')
		|| stripTags((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]).replace(/\s*-\s*G站漫畫.*$/, '')
		|| fallback
		|| 'GoDa漫画';
}

function parseDescription(html) {
	const ldJson = (html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i) || [])[1];
	if (ldJson) {
		try {
			const data = JSON.parse(ldJson);
			if (data.description) {
				return decodeHtml(data.description);
			}
		} catch (_) {}
	}
	return decodeHtml((html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) || [])[1]);
}

function parseCover(html) {
	return unwrapProxiedImage((html.match(/<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i) || [])[1])
		|| unwrapProxiedImage(attr((html.match(/<img\b[^>]*alt=["'][^"']*["'][^>]*>/i) || [])[0], 'src'))
		|| FALLBACK_COVER;
}

function parseJsonChapterList(json, mangaUrl) {
	const data = json && json.data;
	const chapters = data && data.chapters;
	if (!Array.isArray(chapters)) {
		throw new Error('无法解析章节目录。');
	}
	const mangaSlug = data.slug || parseMangaSlug(mangaUrl);
	const mid = String((data && data.id) || '');
	chapterListCache[mid || mangaSlug] = chapters;
	return chapters.map(item => {
		const attrs = item.attributes || {};
		const chapterPageUrl = attrs.slug && mangaSlug ? absoluteUrl('/manga/' + mangaSlug + '/' + attrs.slug) : mangaUrl;
		return {
			title: attrs.title || '章节',
			url: makeChapterPayload({
				mangaUrl,
				chapterPageUrl,
				mid,
				cid: String(item.id || ''),
				slug: attrs.slug || ''
			})
		};
	});
}

function parseRecentChapterList(html, mangaUrl) {
	const result = [];
	const seen = {};
	const chapterRe = /<a\b[^>]*href=["']([^"']*\/manga\/(?!page\/)[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
	let match;
	while ((match = chapterRe.exec(html)) !== null) {
		const block = match[0] + match[2];
		const cid = attr(block, 'data-cs') || attr(block, 'data-cid');
		if (!cid || seen[cid]) {
			continue;
		}
		seen[cid] = true;
		result.push({
			title: attr(block, 'data-ct') || stripTags(block) || '章节',
			url: makeChapterPayload({
				mangaUrl,
				chapterPageUrl: absoluteUrl(match[1]),
				mid: String(attr(block, 'data-ms') || attr(block, 'data-mid') || ''),
				cid: String(cid)
			})
		});
	}
	return result;
}

function parseChapterPayload(chapterUrl) {
	if (typeof chapterUrl === 'string' && chapterUrl.trim().charAt(0) === '{') {
		return JSON.parse(chapterUrl);
	}
	const text = String(chapterUrl || '');
	if (text.indexOf('goda://') === 0) {
		const params = new URLSearchParams(text.replace(/^goda:\/\//, ''));
		return {
			mangaUrl: params.get('mu') || '',
			chapterPageUrl: params.get('cu') || '',
			mid: params.get('m') || '',
			cid: params.get('c') || '',
			slug: params.get('s') || ''
		};
	}
	const cidMatch = text.match(/\/manga\/([^/?#]+)\/([^/?#]+)/i);
	return {
		mangaUrl: cidMatch ? BASE_URL + '/manga/' + cidMatch[1] : '',
		chapterPageUrl: /^https?:\/\//i.test(text) ? text : '',
		slug: cidMatch ? cidMatch[2] : '',
		mid: '',
		cid: ''
	};
}

function alternateImageHost(url) {
	if (/^https:\/\/f40-1-4\.g-mh\.online\//i.test(url)) {
		return url.replace(/^https:\/\/f40-1-4\.g-mh\.online\//i, 'https://t40-1-4.g-mh.online/');
	}
	if (/^https:\/\/t40-1-4\.g-mh\.online\//i.test(url)) {
		return url.replace(/^https:\/\/t40-1-4\.g-mh\.online\//i, 'https://f40-1-4.g-mh.online/');
	}
	return '';
}

function imageHost(line) {
	return Number(line) === 2 ? 'https://f40-1-4.g-mh.online' : 'https://t40-1-4.g-mh.online';
}

function resolveChapterImageUrl(path, line) {
	const imagePath = String(path || '');
	if (/^https?:\/\//i.test(imagePath)) {
		const fallback = alternateImageHost(imagePath);
		return /^https:\/\/f40-1-4\.g-mh\.online\//i.test(imagePath) && fallback ? fallback : imagePath;
	}
	const primaryUrl = absoluteUrl(imagePath, imageHost(line));
	const fallback = alternateImageHost(primaryUrl);
	return /^https:\/\/f40-1-4\.g-mh\.online\//i.test(primaryUrl) && fallback ? fallback : primaryUrl;
}

function defaultImageInfo(url) {
	return { url, width: DEFAULT_IMAGE_WIDTH, height: DEFAULT_IMAGE_HEIGHT };
}

async function setMangaListFilterOptions() {
	window.Rulia.endWithResult([
		{ label: '分类', name: 'category', options: CATEGORIES },
		{ label: '排序', name: 'sort', options: SORTS }
	]);
}

async function getMangaList(page, pageSize, keyword, rawFilterOptions) {
	try {
		const filterOptions = parseFilterOptions(rawFilterOptions);
		const pages = sitePagesForRequest(page, pageSize);
		const results = [];
		for (let i = 0; i < pages.length; i++) {
			const listPage = pages[i];
			const url = keyword ? buildSearchUrl(listPage, keyword) : buildListUrl(listPage, filterOptions);
			const html = await requestText(url);
			const parsed = parseMangaList(html);
			if (!parsed.list.length) {
				break;
			}
			results.push(parsed);
		}
		window.Rulia.endWithResult(mergeListResults(results));
	} catch (error) {
		window.Rulia.endWithException(error.message);
	}
}

async function getMangaData(dataPageUrl) {
	try {
		const mangaUrl = normalizeRequestUrl(dataPageUrl);
		if (mangaDataCache[mangaUrl]) {
			window.Rulia.endWithResult(mangaDataCache[mangaUrl]);
			return;
		}
		const slug = parseMangaSlug(mangaUrl);
		const html = await requestText(mangaUrl);
		const mid = extractMid(html);
		const coverUrl = parseCover(html);
		let chapterList = [];
		try {
			const chapterJson = await requestJson(API_URL + '/api/manga/get?mid=' + encodeURIComponent(mid) + '&mode=all', mangaUrl);
			chapterList = parseJsonChapterList(chapterJson, mangaUrl);
		} catch (_) {
			chapterList = parseRecentChapterList(html, mangaUrl);
		}
		const result = {
			title: parseTitle(html, slug),
			description: parseDescription(html),
			coverUrl,
			chapterList
		};
		mangaDataCache[mangaUrl] = result;
		window.Rulia.endWithResult(result);
	} catch (error) {
		window.Rulia.endWithException(error.message);
	}
}

async function resolveMissingChapterIds(payload) {
	if (payload.mid && payload.cid) {
		return payload;
	}
	if (!payload.mangaUrl) {
		throw new Error('无法解析章节地址。');
	}
	const html = await requestText(payload.mangaUrl);
	payload.mid = payload.mid || extractMid(html);
	if (payload.slug) {
		const chapterJson = await requestJson(API_URL + '/api/manga/get?mid=' + encodeURIComponent(payload.mid) + '&mode=all', payload.mangaUrl);
		const chapters = chapterJson && chapterJson.data && chapterJson.data.chapters;
		const hit = Array.isArray(chapters) && chapters.find(item => item.attributes && item.attributes.slug === payload.slug);
		payload.cid = hit ? String(hit.id) : '';
		if (hit && hit.attributes && !payload.chapterPageUrl) {
			payload.chapterPageUrl = absoluteUrl('/manga/' + (chapterJson.data.slug || parseMangaSlug(payload.mangaUrl)) + '/' + hit.attributes.slug);
		}
	}
	return payload;
}

async function getChapterImageList(chapterUrl) {
	try {
		const payload = await resolveMissingChapterIds(parseChapterPayload(chapterUrl));
		const cacheKey = payload.cid || payload.chapterPageUrl || chapterUrl;
		if (chapterImageCache[cacheKey]) {
			window.Rulia.endWithResult(chapterImageCache[cacheKey]);
			return;
		}
		if (!payload.mid || !payload.cid) {
			throw new Error('无法解析章节 ID。');
		}
		const json = await requestJson(API_URL + '/api/chapter/getinfo?m=' + encodeURIComponent(payload.mid) + '&c=' + encodeURIComponent(payload.cid), payload.chapterPageUrl || payload.mangaUrl || BASE_URL + '/');
		const imagesInfo = json && json.data && json.data.info && json.data.info.images;
		const images = imagesInfo && imagesInfo.images;
		if (!Array.isArray(images) || !images.length) {
			throw new Error('无法解析章节图片。');
		}
		const result = images.map(item => defaultImageInfo(resolveChapterImageUrl(item.url, imagesInfo.line)));
		chapterImageCache[cacheKey] = result;
		window.Rulia.endWithResult(result);
	} catch (error) {
		window.Rulia.endWithException(error.message);
	}
}

async function getImageUrl(path) {
	window.Rulia.endWithResult(path);
}
