const BASE_URL = 'https://www.manhuazhan.org';
const MIRROR_URL = 'https://www.manhuazhan.com';
const FALLBACK_COVER = BASE_URL + '/template/pc/manhuazhan/images/favicon.ico';
const DEFAULT_IMAGE_WIDTH = 800;
const DEFAULT_IMAGE_HEIGHT = 1200;
const SITE_PAGE_SIZE = 24;
const REQUEST_TIMEOUT = 12000;

const mangaDataCache = {};
const chapterImageCache = {};

const CATEGORIES = [
	{ label: '全部', value: '0' },
	{ label: '国产漫画', value: '1' },
	{ label: '日本漫画', value: '2' },
	{ label: '韩国漫画', value: '3' },
	{ label: '欧美漫画', value: '4' }
];

const STATUSES = [
	{ label: '全部', value: '0' },
	{ label: '连载', value: '1' },
	{ label: '完结', value: '2' }
];

const IMAGE_KEYS = [
	'4-bXd9iN',
	'4-RXyjry',
	'4-oYvwVy',
	'4-4ZY57U',
	'4-mbJpU7',
	'4-6MM2Ei',
	'4-54TiQr',
	'4-Ph5xx9',
	'4-bYgePR',
	'4-Z9A3bW'
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

function alternateManhuazhanUrl(url) {
	const normalizedUrl = normalizeRequestUrl(url);
	const parsed = new URL(normalizedUrl);
	if (!/^(?:www\.)?manhuazhan\.(?:org|com)$/i.test(parsed.hostname)) {
		return '';
	}
	const targetBase = /\.org$/i.test(parsed.hostname) ? MIRROR_URL : BASE_URL;
	return targetBase + parsed.pathname + parsed.search + parsed.hash;
}

function isTransientRequestError(error) {
	return /task\s+was\s+canceled|timeout|timed?\s*out|cancel(?:ed|led)|network/i.test(String(error && error.message || error || ''));
}

function isVerificationPage(html) {
	return /安全验证|验证码|人机验证|访问验证|请完成验证|captcha/i.test(String(html || ''));
}

function isDeletedComicPage(html) {
	return /漫画(?:已|已经)删除|该漫画(?:已|已经)删除|作品(?:已|已经)删除|资源(?:已|已经)删除/i.test(String(html || ''));
}

async function requestTextOnce(url, referer) {
	return await window.Rulia.httpRequest({
		url: normalizeRequestUrl(url),
		method: 'GET',
		headers: requestHeaders(referer),
		timeout: REQUEST_TIMEOUT
	});
}

async function requestText(url, referer) {
	try {
		return await requestTextOnce(url, referer);
	} catch (error) {
		const mirrorUrl = alternateManhuazhanUrl(url);
		const originalUrl = normalizeRequestUrl(url);
		if (mirrorUrl && mirrorUrl !== originalUrl && isTransientRequestError(error)) {
			return await requestTextOnce(mirrorUrl, referer ? alternateManhuazhanUrl(referer) || referer : MIRROR_URL + '/');
		}
		throw error;
	}
}

function errorMessage(error) {
	if (isTransientRequestError(error)) {
		return '源站响应超时或请求被取消，请稍后重试。';
	}
	return error && error.message ? error.message : String(error || 'Unknown error');
}

function cleanImageUrl(url) {
	const imageUrl = decodeHtml(url || '');
	if (!imageUrl || /blank\.png/i.test(imageUrl)) {
		return '';
	}
	return absoluteUrl(imageUrl)
		.replace(/^https:\/\/static-tw\.baozimh\.com\//i, 'https://s2.bzcdn.net/')
		.replace(/^https:\/\/s\d+\.baozimh\.com\//i, 'https://s2.bzcdn.net/');
}

function parseMangaList(html) {
	const result = [];
	const seen = {};
	const itemRe = /<a\b[^>]*href=["']([^"']*\/comic\/\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
	let match;
	while ((match = itemRe.exec(html || '')) !== null) {
		const block = match[2];
		const imgHtml = (block.match(/<img\b[^>]*>/i) || [])[0] || '';
		const url = absoluteUrl(match[1]);
		if (seen[url]) {
			continue;
		}
		const title = attr(match[0], 'title')
			|| stripTags((block.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i) || [])[1])
			|| attr(imgHtml, 'alt');
		if (!title) {
			continue;
		}
		seen[url] = true;
		const latest = stripTags((block.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i) || [])[1]);
		result.push({
			title: latest ? title + ' - ' + latest : title,
			url,
			coverUrl: cleanImageUrl(attr(imgHtml, 'data-original') || attr(imgHtml, 'data-src') || attr(imgHtml, 'src')) || FALLBACK_COVER
		});
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
	const category = filterOptions.category || '0';
	const status = filterOptions.status || '0';
	let path = '/category/list/' + category;
	if (status !== '0') {
		path += '/finish/' + status;
	}
	if (page > 1) {
		path += '/page/' + page;
	}
	return BASE_URL + path;
}

function buildSearchUrl(page, keyword) {
	const params = new URLSearchParams();
	params.set('key', keyword);
	if (page > 1) {
		params.set('page', page.toString());
	}
	return BASE_URL + '/search?' + params.toString();
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
	return stripTags((html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || [])[1])
		|| decodeHtml((html.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i) || [])[1])
		|| stripTags((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]).replace(/[_-].*$/, '')
		|| fallback
		|| '漫画站';
}

function parseDescription(html) {
	const info = [];
	(html || '').replace(/<p>\s*<span>([^<]+)<\/span>\s*([\s\S]*?)<\/p>/gi, (_, label, value) => {
		const text = stripTags(value);
		if (text && !/点击|最新章节|更新时间/.test(label)) {
			info.push(stripTags(label) + text);
		}
		return '';
	});
	const summary = decodeHtml((html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) || [])[1]);
	return info.concat(summary ? [summary] : []).join(' · ');
}

function parseCover(html) {
	return cleanImageUrl((html.match(/<div\b[^>]*class=["'][^"']*\bd-vod-pic\b[^"']*["'][^>]*>[\s\S]*?<img\b[^>]*src=["']([^"']*)["']/i) || [])[1])
		|| cleanImageUrl((html.match(/<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i) || [])[1])
		|| FALLBACK_COVER;
}

function parseChapterList(html) {
	const result = [];
	const seen = {};
	const listHtml = (html.match(/<div\b[^>]*class=["'][^"']*\bd-player-list\b[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*(?:<div\b[^>]*class=["'][^"']*\bd-detail\b|<h2\b|$)/i) || [])[1] || '';
	const sectionHtml = (html.match(/章节列表[\s\S]*?(?:剧情简介|相关动漫|上升大作|本站漫画|Copyright|$)/i) || [])[0] || '';
	const sources = [listHtml, sectionHtml, html];
	for (let i = 0; i < sources.length; i++) {
		const source = sources[i] || '';
		const chapterRe = /<a\b[^>]*href=["']([^"']*\/chapter\/\d+[-_]\d+(?:\.html)?[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
		let match;
		while ((match = chapterRe.exec(source)) !== null) {
			const title = stripTags(match[2]) || attr(match[0], 'title') || '章节';
			const url = absoluteUrl(match[1]);
			if (seen[url] || !title || /^(更多|上一章|下一章|最新章节)$/.test(title)) {
				continue;
			}
			seen[url] = true;
			result.push({ title, url });
		}
		if (result.length) {
			break;
		}
	}
	return result;
}

function base64DecodeBinary(value) {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
	let output = '';
	let buffer;
	let bits = 0;
	let index = 0;
	let code;
	while ((code = value.charAt(index++))) {
		if (code === '=') {
			break;
		}
		const digit = chars.indexOf(code);
		if (digit < 0) {
			continue;
		}
		buffer = bits % 4 ? buffer * 64 + digit : digit;
		if (bits++ % 4) {
			output += String.fromCharCode(255 & (buffer >> ((-2 * bits) & 6)));
		}
	}
	return output;
}

function decryptImageData(data, cid) {
	const key = IMAGE_KEYS[Math.abs(Number(cid) || 0) % IMAGE_KEYS.length];
	const encrypted = base64DecodeBinary(data);
	let jsonBase64 = '';
	for (let i = 0; i < encrypted.length; i++) {
		jsonBase64 += String.fromCharCode(encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length));
	}
	return JSON.parse(base64DecodeBinary(jsonBase64));
}

function parseChapterImages(html) {
	const cid = parseInt((html.match(/var\s+cid\s*=\s*(\d+)/i) || [])[1], 10);
	const data = (html.match(/var\s+DATA\s*=\s*'([^']+)'/i) || [])[1];
	if (!cid || !data) {
		throw new Error('无法解析章节图片参数。');
	}
	const images = decryptImageData(data, cid);
	if (!Array.isArray(images) || !images.length) {
		throw new Error('无法解析章节图片。');
	}
	return images.map(item => ({
		url: cleanImageUrl(item.url),
		width: Number(item.width) || DEFAULT_IMAGE_WIDTH,
		height: Number(item.height) || DEFAULT_IMAGE_HEIGHT
	})).filter(item => item.url);
}

async function setMangaListFilterOptions() {
	window.Rulia.endWithResult([
		{ label: '分类', name: 'category', options: CATEGORIES },
		{ label: '状态', name: 'status', options: STATUSES }
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
			if (isVerificationPage(html)) {
				throw new Error('源站要求验证码校验。请先在浏览器或 Rulia 内完成验证，或改用分类浏览。');
			}
			const parsed = parseMangaList(html);
			if (!parsed.list.length) {
				break;
			}
			results.push(parsed);
		}
		window.Rulia.endWithResult(mergeListResults(results));
	} catch (error) {
		window.Rulia.endWithException(errorMessage(error));
	}
}

async function getMangaData(dataPageUrl) {
	try {
		const mangaUrl = normalizeRequestUrl(dataPageUrl);
		if (mangaDataCache[mangaUrl]) {
			window.Rulia.endWithResult(mangaDataCache[mangaUrl]);
			return;
		}
		const html = await requestText(mangaUrl);
		if (isVerificationPage(html)) {
			throw new Error('源站要求验证码校验。请先在浏览器或 Rulia 内完成验证后重试。');
		}
		if (isDeletedComicPage(html)) {
			throw new Error('源站提示该漫画已删除。');
		}
		let detailHtml = html;
		let chapterList = parseChapterList(detailHtml);
		if (!chapterList.length) {
			throw new Error('无法解析章节目录。');
		}
		const result = {
			title: parseTitle(detailHtml),
			description: parseDescription(detailHtml),
			coverUrl: parseCover(detailHtml),
			chapterList
		};
		mangaDataCache[mangaUrl] = result;
		window.Rulia.endWithResult(result);
	} catch (error) {
		window.Rulia.endWithException(errorMessage(error));
	}
}

async function getChapterImageList(chapterUrl) {
	try {
		const normalizedChapterUrl = normalizeRequestUrl(chapterUrl);
		if (chapterImageCache[normalizedChapterUrl]) {
			window.Rulia.endWithResult(chapterImageCache[normalizedChapterUrl]);
			return;
		}
		const html = await requestText(normalizedChapterUrl, normalizedChapterUrl);
		const result = parseChapterImages(html);
		chapterImageCache[normalizedChapterUrl] = result;
		window.Rulia.endWithResult(result);
	} catch (error) {
		window.Rulia.endWithException(errorMessage(error));
	}
}

async function getImageUrl(path) {
	window.Rulia.endWithResult(path);
}
