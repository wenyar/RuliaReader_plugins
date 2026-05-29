const BASE_URL = 'https://se8.us';
const FALLBACK_COVER = BASE_URL + '/template/pc/default/images/app_logo.png';
const SITE_PAGE_SIZE = 24;
const REQUEST_TIMEOUT = 15000;
const IMAGE_PROBE_TIMEOUT = 8000;

const CATEGORIES = [
	{ label: '全部', value: '' },
	{ label: '巨乳', value: 'tags/61' },
	{ label: '青春', value: 'tags/62' },
	{ label: '偷情', value: 'tags/63' },
	{ label: '校园', value: 'tags/11' },
	{ label: '后宫', value: 'tags/15' },
	{ label: '耽美', value: 'tags/16' },
	{ label: '恋爱', value: 'tags/17' },
	{ label: '都市', value: 'tags/31' },
	{ label: '性交', value: 'tags/66' }
];

const STATUSES = [
	{ label: '全部', value: '' },
	{ label: '连载', value: 'finish/1' },
	{ label: '完结', value: 'finish/2' }
];

const SORTS = [
	{ label: '默认', value: '' },
	{ label: '最热', value: 'order/hits' },
	{ label: '最新', value: 'order/addtime' },
	{ label: '免费', value: 'pay/1' },
	{ label: '付费', value: 'pay/2' }
];

function absoluteUrl(url) {
	if (!url) {
		return '';
	}
	return new URL(String(url).trim(), BASE_URL).toString();
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
	return text
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
	const match = html.match(new RegExp('\\s' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i'));
	return decodeHtml((match && (match[1] || match[2] || match[3])) || '');
}

function normalizeRequestUrl(value) {
	const rawUrl = typeof value === 'string' ? value : (value && (value.url || value.href)) || '';
	const url = absoluteUrl(rawUrl);
	if (!/^https?:\/\//i.test(url)) {
		throw new Error('Invalid request URL: ' + rawUrl);
	}
	return url;
}

function isCertificateStatusError(error) {
	return /\b526\b|invalid\s+ssl|certificate|ssl/i.test(String(error && error.message || error || ''));
}

function errorMessage(error) {
	if (isCertificateStatusError(error)) {
		return '源站 HTTPS 证书异常（526），请稍后重试或在可访问该站点的网络环境下使用。';
	}
	return error && error.message ? error.message : String(error || 'Unknown error');
}

async function requestText(url, referer) {
	const options = {
		url: normalizeRequestUrl(url),
		method: 'GET',
		headers: {
			Referer: referer ? normalizeRequestUrl(referer) : BASE_URL + '/',
			'User-Agent': 'Mozilla/5.0'
		},
		timeout: REQUEST_TIMEOUT
	};
	return await window.Rulia.httpRequest(options);
}

function usableImageUrl(imgHtml) {
	const original = attr(imgHtml, 'data-original');
	const dataSrc = attr(imgHtml, 'data-src');
	const src = attr(imgHtml, 'src');
	const url = original || dataSrc || src;
	if (!url || /(?:bg_loadimg|lazyload_img|data:image)/i.test(url)) {
		return '';
	}
	return absoluteUrl(url);
}

function parseMangaList(html) {
	const byUrl = {};
	const coverRe = /<a\b[^>]*href=["']([^"']*\/index\.php\/comic\/[^"']+)["'][^>]*>([\s\S]*?<img\b[^>]*>[\s\S]*?)<\/a>/gi;
	let match;
	while ((match = coverRe.exec(html)) !== null) {
		const url = absoluteUrl(match[1]);
		if (byUrl[url]) {
			continue;
		}
		const block = match[2];
		const imgMatch = block.match(/<img\b[^>]*>/i);
		const imgHtml = imgMatch ? imgMatch[0] : '';
		const title = attr(imgHtml, 'alt') || stripTags(block);
		if (!title) {
			continue;
		}
		byUrl[url] = {
			title,
			url,
			coverUrl: usableImageUrl(imgHtml) || FALLBACK_COVER
		};
	}

	const titleRe = /<a\b[^>]*href=["']([^"']*\/index\.php\/comic\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
	while ((match = titleRe.exec(html)) !== null) {
		const url = absoluteUrl(match[1]);
		const title = stripTags(match[2]);
		if (!title) {
			continue;
		}
		if (byUrl[url]) {
			byUrl[url].title = title;
		} else {
			byUrl[url] = { title, url, coverUrl: FALLBACK_COVER };
		}
	}

	return { list: Object.keys(byUrl).map(url => byUrl[url]) };
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

function buildCategoryUrl(page, filterOptions) {
	const selected = filterOptions.sort || filterOptions.status || filterOptions.category || '';
	const base = BASE_URL + '/index.php/category' + (selected ? '/' + selected.replace(/^\/+|\/+$/g, '') : '');
	return page > 1 ? base + '/page/' + page : base + '/';
}

function buildSearchUrl(page, keyword) {
	const params = new URLSearchParams();
	params.set('key', keyword);
	if (page > 1) {
		params.set('page', page.toString());
	}
	return BASE_URL + '/index.php/search?' + params.toString();
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
		|| stripTags((html.match(/<div\b[^>]*class=["'][^"']*de-info__title[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) || [])[1])
		|| stripTags((html.match(/<title>([\s\S]*?)(?:\s+-\s+|<\/title>)/i) || [])[1])
		|| fallback
		|| 'Se8';
}

function parseDescription(html) {
	const detail = (html.match(/简介[:：]?([\s\S]*?)(?:展开|开始阅读|<\/div>\s*<div)/i) || [])[1];
	if (detail) {
		return stripTags(detail).replace(/^[:：]\s*/, '');
	}
	const meta = (html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) || [])[1];
	return decodeHtml(meta);
}

function parseCover(html, title) {
	const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const titledImg = html.match(new RegExp("<img\\b[^>]*alt=[\"']" + escapedTitle + "[\"'][^>]*>", 'i'));
	const firstLazy = html.match(/<img\b[^>]*class=["'][^"']*lazy[^"']*["'][^>]*>/i);
	return usableImageUrl((titledImg || firstLazy || [])[0] || '') || FALLBACK_COVER;
}

function parseChapterList(html) {
	const result = [];
	const seen = {};
	const chapterRe = /<a\b[^>]*href=["']([^"']*\/index\.php\/chapter\/\d+)["'][^>]*>([\s\S]*?)<\/a>/gi;
	let match;
	while ((match = chapterRe.exec(html)) !== null) {
		const title = stripTags(match[2]);
		const url = absoluteUrl(match[1]);
		if (!title || title === '开始阅读' || seen[url]) {
			continue;
		}
		seen[url] = true;
		result.push({ title, url });
	}
	return result;
}

function loadImageInfo(url) {
	return new Promise(resolve => {
		const img = new Image();
		let done = false;
		const finish = () => {
			if (done) {
				return;
			}
			done = true;
			resolve({
				url,
				width: img.width || 1,
				height: img.height || 1
			});
		};
		img.onload = img.onerror = finish;
		setTimeout(finish, IMAGE_PROBE_TIMEOUT);
		img.src = url;
	});
}

async function setMangaListFilterOptions() {
	window.Rulia.endWithResult([
		{ label: '题材', name: 'category', options: CATEGORIES },
		{ label: '状态', name: 'status', options: STATUSES },
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
			const url = keyword ? buildSearchUrl(listPage, keyword) : buildCategoryUrl(listPage, filterOptions);
			const html = await requestText(url);
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
		const html = await requestText(mangaUrl);
		const title = parseTitle(html, 'Se8');
		window.Rulia.endWithResult({
			title,
			description: parseDescription(html),
			coverUrl: parseCover(html, title),
			chapterList: parseChapterList(html)
		});
	} catch (error) {
		window.Rulia.endWithException(errorMessage(error));
	}
}

async function getChapterImageList(chapterUrl) {
	try {
		const normalizedChapterUrl = normalizeRequestUrl(chapterUrl);
		const html = await requestText(normalizedChapterUrl, normalizedChapterUrl);
		const images = [];
		const seen = {};
		const imgRe = /<img\b[^>]*class=["'][^"']*lazy-read[^"']*["'][^>]*>/gi;
		let match;
		while ((match = imgRe.exec(html)) !== null) {
			const url = usableImageUrl(match[0]);
			if (url && !seen[url]) {
				seen[url] = true;
				images.push(url);
			}
		}
		if (!images.length) {
			throw new Error('无法解析章节图片。');
		}
		window.Rulia.endWithResult(await Promise.all(images.map(loadImageInfo)));
	} catch (error) {
		window.Rulia.endWithException(errorMessage(error));
	}
}

async function getImageUrl(path) {
	window.Rulia.endWithResult(path);
}
