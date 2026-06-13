const BASE_URL = 'https://www.manben.com';
const FALLBACK_COVER = 'https://css99tel.cdndm5.com/v202604231644/cartoonupload/images/new/m_header_logo.png';
const DEFAULT_IMAGE_WIDTH = 800;
const DEFAULT_IMAGE_HEIGHT = 1200;
const SITE_PAGE_SIZE = 10;
const REQUEST_TIMEOUT = 15000;

const mangaDataCache = {};
const chapterImageCache = {};

const STATUSES = [
	{ label: '全部', value: '0' },
	{ label: '连载', value: '1' },
	{ label: '完结', value: '2' }
];

const TAGS = [
	{ label: '全部', value: '0' },
	{ label: '搞笑', value: '37' },
	{ label: '奇幻', value: '14' },
	{ label: '热血', value: '31' },
	{ label: '悬疑', value: '17' },
	{ label: '格斗', value: '28' },
	{ label: '科幻', value: '25' },
	{ label: '励志', value: '10' },
	{ label: '校园', value: '1' },
	{ label: '爱情', value: '26' },
	{ label: '日常', value: '7' },
	{ label: '战争', value: '12' },
	{ label: '其他', value: '3' }
];

const AUDIENCES = [
	{ label: '全部', value: '0' },
	{ label: '少年向', value: '1' },
	{ label: '少女向', value: '2' },
	{ label: '青年向', value: '3' }
];

const AREAS = [
	{ label: '全部', value: '0' },
	{ label: '港台', value: '35' },
	{ label: '日韩', value: '36' },
	{ label: '大陆', value: '37' },
	{ label: '欧美', value: '52' }
];

const SORTS = [
	{ label: '更新时间', value: '2' },
	{ label: '热门人气', value: '4' }
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
		rdquo: '”',
		mdash: '-'
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
		.replace(/<%[\s\S]*?%>/g, '')
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

function requestHeaders(referer, ajax, noReferer) {
	const headers = {
		'User-Agent': 'Mozilla/5.0'
	};
	if (!noReferer) {
		headers.Referer = referer ? normalizeRequestUrl(referer) : BASE_URL + '/';
	}
	if (ajax) {
		headers['X-Requested-With'] = 'XMLHttpRequest';
		headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
	}
	return headers;
}

async function requestText(url, referer, options) {
	const requestUrl = normalizeRequestUrl(url);
	const config = options || {};
	return await rulia().httpRequest({
		url: requestUrl,
		method: config.method || 'GET',
		headers: Object.assign(requestHeaders(referer, config.ajax, config.noReferer), config.headers || {}),
		body: config.body || undefined,
		timeout: REQUEST_TIMEOUT
	});
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

function cleanImageUrl(url, base) {
	const imageUrl = decodeHtml(url || '').replace(/^\/\//, 'https://');
	if (!imageUrl || /^data:/i.test(imageUrl)) {
		return '';
	}
	return absoluteUrl(imageUrl, base || BASE_URL).replace(/^http:\/\//i, 'https://');
}

function toListItem(item) {
	if (!item || !item.Title || !item.Url) {
		return null;
	}
	return {
		title: decodeHtml(item.Title),
		url: absoluteUrl(item.Url),
		coverUrl: cleanImageUrl(item.BigPic || item.Pic) || FALLBACK_COVER,
		latestChapter: decodeHtml(item.LastPartShowName || item.LastUpdateInfo || ''),
		author: Array.isArray(item.Author) ? item.Author.map(decodeHtml).filter(Boolean).join(' / ') : decodeHtml(item.Author || ''),
		description: decodeHtml(item.Content || '')
	};
}

function parseSearchList(html) {
	const result = [];
	const seen = {};
	const itemRe = /<div\b[^>]*class=["'][^"']*\bitem\b[^"']*["'][^>]*>([\s\S]*?)(?=<div\b[^>]*class=["'][^"']*\bitem\b|<div\b[^>]*class=["'][^"']*\bpager\b|<\/div>\s*<\/div>\s*<\/div>|$)/gi;
	let match;
	while ((match = itemRe.exec(html || '')) !== null) {
		const block = match[1];
		const link = (block.match(/<a\b[^>]*href=["']([^"']*\/mh-[^"']+\/)["'][^>]*>/i) || [])[1];
		const url = link ? absoluteUrl(link) : '';
		if (!url || seen[url]) {
			continue;
		}
		const imgHtml = (block.match(/<img\b[^>]*>/i) || [])[0] || '';
		const title = stripTags((block.match(/<p\b[^>]*class=["'][^"']*\btitle\b[^"']*["'][^>]*>[\s\S]*?<a\b[^>]*>([\s\S]*?)<\/a>/i) || [])[1])
			|| attr(imgHtml, 'alt');
		if (!title) {
			continue;
		}
		seen[url] = true;
		result.push({
			title,
			url,
			coverUrl: cleanImageUrl(attr(imgHtml, 'src')) || FALLBACK_COVER,
			description: stripTags((block.match(/<p\b[^>]*class=["'][^"']*\btip\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i) || [])[1])
		});
	}
	return { list: result };
}

function listPagePayload(page, filterOptions) {
	const params = new URLSearchParams();
	params.set('t', '2');
	params.set('pageindex', String(Math.max(1, parseInt(page, 10) || 1)));
	params.set('sc', '1');
	params.set('tsort', filterOptions.sort || '2');
	params.set('tagid', filterOptions.tag || '0');
	params.set('tst', filterOptions.status || '0');
	params.set('tarea', filterOptions.area || '0');
	params.set('tgroup', filterOptions.audience || '0');
	params.set('tnm', filterOptions.letter || '');
	return params.toString();
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

async function requestListPage(page, filterOptions) {
	const text = await requestText(BASE_URL + '/pagerdata.ashx?' + listPagePayload(page, filterOptions), BASE_URL + '/mh-list/');
	const json = JSON.parse(text || '[]');
	if (!Array.isArray(json)) {
		return { list: [] };
	}
	return { list: json.map(toListItem).filter(Boolean) };
}

function buildSearchUrl(page, keyword) {
	const params = new URLSearchParams();
	params.set('page', String(Math.max(1, parseInt(page, 10) || 1)));
	params.set('title', keyword);
	params.set('language', '1');
	return BASE_URL + '/search?' + params.toString();
}

function parseTitle(html, fallback) {
	const scoreTitle = stripTags((html.match(/<div\b[^>]*class=["'][^"']*\bscore\b[^"']*["'][^>]*>[\s\S]*?<span\b[^>]*class=["'][^"']*\btitle\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) || [])[1]);
	return scoreTitle
		|| decodeHtml((html.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i) || [])[1])
		|| stripTags((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]).replace(/[_-].*$/, '')
		|| fallback
		|| '漫本';
}

function parseCover(html) {
	const infoHtml = parseComicInfo(html);
	const infoCover = (infoHtml.match(/<div\b[^>]*class=["'][^"']*\bcover\b[^"']*["'][^>]*>[\s\S]*?<img\b[^>]*src=["']([^"']+)["']/i) || [])[1]
		|| (infoHtml.match(/<img\b[^>]*src=["']([^"']+)["'][^>]*>/i) || [])[1];
	return cleanImageUrl(infoCover)
		|| cleanImageUrl((html.match(/<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i) || [])[1])
		|| cleanImageUrl((html.match(/<img\b[^>]*alt=["'][^"']*["'][^>]*src=["']([^"']*_\d+x\d+[^"']*)["']/i) || [])[1])
		|| FALLBACK_COVER;
}

function parseComicInfo(html) {
	return (html.match(/<div\b[^>]*class=["'][^"']*\bcomicInfo\b[^"']*["'][^>]*>([\s\S]*?)(?:<div\b[^>]*class=["'][^"']*\bcatalog\b|<!--目录|<!--评论|<div\b[^>]*class=["'][^"']*\bcomment\b|$)/i) || [])[1] || '';
}

function parseDescription(html) {
	const infoHtml = parseComicInfo(html);
	const content = stripTags((infoHtml.match(/<p\b[^>]*class=["'][^"']*\bcontent\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i) || [])[1]);
	const author = stripTags((infoHtml.match(/作\s*者[：:\s]*([\s\S]*?)<\/span>/i) || [])[1]);
	const category = stripTags((infoHtml.match(/类\s*别[：:\s]*([\s\S]*?)<\/span>/i) || [])[1]);
	const status = stripTags((infoHtml.match(/状\s*态[：:\s]*([^<]+)<\/span>/i) || [])[1]);
	const meta = decodeHtml((html.match(/<meta\b[^>]*name=["']Description["'][^>]*content=["']([^"']*)["']/i) || [])[1])
		.replace(/^.*?漫画简介：/, '')
		.replace(/\s*\.\.\.\s*$/, '');
	return [
		content || meta,
		author ? '作者：' + author : '',
		category ? '类别：' + category : '',
		status ? '状态：' + status : ''
	].filter(Boolean).join('\n');
}

function parseChapterList(html) {
	const result = [];
	const seen = {};
	const chapterRe = /<a\b[^>]*href=["'](\/m\d+\/)["'][^>]*>([\s\S]*?)<\/a>/gi;
	let match;
	while ((match = chapterRe.exec(html || '')) !== null) {
		let title = stripTags(match[2]) || attr(match[0], 'title') || '章节';
		if (!title || /^(开始阅读|上一页|下一页)$/.test(title) || /公告|通知|说明/.test(title)) {
			continue;
		}
		const url = absoluteUrl(match[1]);
		if (seen[url]) {
			continue;
		}
		seen[url] = true;
		result.push({ title, url });
	}
	result.reverse();
	return result;
}

function parseChapterId(chapterUrl) {
	return (String(chapterUrl || '').match(/\/m(\d+)\/?/i) || [])[1] || '';
}

function parseChapterImageResponse(text) {
	const jsonText = (String(text || '').match(/chapterimage\s*=\s*(\{[\s\S]*?\})\s*;/i) || [])[1];
	if (!jsonText) {
		throw new Error('无法解析章节图片接口。');
	}
	return JSON.parse(jsonText);
}

function chapterImageUrl(cid, page) {
	const params = new URLSearchParams();
	params.set('d', String(Date.now()));
	params.set('cid', cid);
	params.set('page', String(page));
	params.set('showtype', '1');
	params.set('ispre', '0');
	return BASE_URL + '/imageshow.ashx?' + params.toString();
}

function imageSizeToDimensions(value) {
	const match = String(value || '').match(/(\d+)\s*\/\s*(\d+)/);
	if (!match) {
		return { width: DEFAULT_IMAGE_WIDTH, height: DEFAULT_IMAGE_HEIGHT };
	}
	return {
		width: Number(match[2]) || DEFAULT_IMAGE_WIDTH,
		height: Number(match[1]) || DEFAULT_IMAGE_HEIGHT
	};
}

function appendImage(items, imagePix, imagePath, imageSize) {
	const url = cleanImageUrl(String(imagePix || '') + String(imagePath || ''), BASE_URL);
	if (!url) {
		return;
	}
	const dimensions = imageSizeToDimensions(imageSize);
	items.push({
		url,
		width: dimensions.width,
		height: dimensions.height
	});
}

async function setMangaListFilterOptions() {
	finish([
		{ label: '状态', name: 'status', options: STATUSES },
		{ label: '标签', name: 'tag', options: TAGS },
		{ label: '受众', name: 'audience', options: AUDIENCES },
		{ label: '地区', name: 'area', options: AREAS },
		{ label: '排序', name: 'sort', options: SORTS }
	]);
}

async function getMangaList(page, pageSize, keyword, rawFilterOptions) {
	try {
		const pages = sitePagesForRequest(page, pageSize);
		const results = [];
		if (keyword) {
			for (let i = 0; i < pages.length; i++) {
				const html = await requestText(buildSearchUrl(pages[i], keyword));
				const parsed = parseSearchList(html);
				if (!parsed.list.length) {
					break;
				}
				results.push(parsed);
			}
			finish(mergeListResults(results));
			return;
		}
		const filterOptions = parseFilterOptions(rawFilterOptions);
		for (let i = 0; i < pages.length; i++) {
			const parsed = await requestListPage(pages[i], filterOptions);
			if (!parsed.list.length) {
				break;
			}
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
		const html = await requestText(mangaUrl);
		const chapterList = parseChapterList(html);
		if (!chapterList.length) {
			throw new Error('无法解析章节目录。');
		}
		const result = {
			title: parseTitle(html),
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
		const normalizedChapterUrl = normalizeRequestUrl(chapterUrl);
		if (chapterImageCache[normalizedChapterUrl]) {
			finish(chapterImageCache[normalizedChapterUrl]);
			return;
		}
		const cid = parseChapterId(normalizedChapterUrl);
		if (!cid) {
			throw new Error('无法解析章节 ID。');
		}
		const result = [];
		for (let page = 1; page <= 300; page++) {
			const text = await requestText(chapterImageUrl(cid, page), '', { noReferer: true });
			const data = parseChapterImageResponse(text);
			const imagePix = data.ImagePix || '';
			const images = Array.isArray(data.Images) ? data.Images : [];
			const imageSizes = Array.isArray(data.ImageSize) ? data.ImageSize : [];
			for (let i = 0; i < images.length; i++) {
				appendImage(result, imagePix, images[i], imageSizes[i]);
			}
			if (data.IsEnd) {
				break;
			}
			if (!images.length) {
				throw new Error('无法解析章节图片。');
			}
		}
		if (!result.length) {
			throw new Error('无法解析章节图片。');
		}
		chapterImageCache[normalizedChapterUrl] = result;
		finish(result);
	} catch (error) {
		fail(error);
	}
}

async function getImageUrl(path) {
	finish(path);
}
