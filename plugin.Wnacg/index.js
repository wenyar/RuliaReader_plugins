const BASE_URL = 'https://www.wnacg.com';
const FALLBACK_COVER = BASE_URL + '/favicon.ico';
const REQUEST_TIMEOUT = 20000;
const SITE_PAGE_SIZE = 12;
const DEFAULT_WIDTH = 900;
const DEFAULT_HEIGHT = 1300;

const mangaDataCache = {};
const chapterImageCache = {};

const CATEGORIES = [
	{ label: '全部', value: '' },
	{ label: 'CG画集', value: '2' },
	{ label: 'Cosplay', value: '3' },
	{ label: '同人志-汉化', value: '1' },
	{ label: '同人志-日语', value: '12' },
	{ label: '杂志&短篇-汉化', value: '10' },
	{ label: '杂志&短篇-日语', value: '14' },
	{ label: '单行本-汉化', value: '9' },
	{ label: '单行本-日语', value: '13' },
	{ label: '韩漫-汉化', value: '20' },
	{ label: '韩漫-生肉', value: '21' }
];

function rulia() {
	return window.Rulia && (window.Rulia.Rulia || window.Rulia);
}

function finish(value) {
	rulia().endWithResult(value);
}

function fail(error) {
	const text = error && error.message ? error.message : String(error || 'Unknown error');
	if (/Just a moment|cf_chl|Cloudflare|Enable JavaScript and cookies/i.test(text)) {
		rulia().endWithException('WNACG 返回 Cloudflare 验证页。请先在 Rulia 共享的浏览器中打开 wnacg.com 并完成验证，确保 cookie 已保存。');
		return;
	}
	rulia().endWithException(text);
}

function decodeHtml(value) {
	const entities = {
		amp: '&',
		lt: '<',
		gt: '>',
		quot: '"',
		apos: "'",
		'#39': "'",
		nbsp: ' ',
		hellip: '...',
		ldquo: '“',
		rdquo: '”'
	};
	return String(value || '')
		.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
		.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
		.replace(/&([a-zA-Z0-9#]+);/g, (_, name) => entities[name] || '&' + name + ';')
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
	const match = String(html || '').match(new RegExp('\\s' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i'));
	return decodeHtml(match ? match[1] || match[2] || match[3] || '' : '');
}

function absoluteUrl(value, base) {
	const raw = decodeHtml(value || '').replace(/^\/\//, 'https://');
	if (!raw) {
		return '';
	}
	return new URL(raw, base || BASE_URL + '/').toString();
}

function normalizeUrl(value, base) {
	const url = absoluteUrl(value, base || BASE_URL + '/');
	if (!/^https?:\/\//i.test(url)) {
		throw new Error('Invalid URL: ' + value);
	}
	return url;
}

function cleanImageUrl(value, base) {
	const url = absoluteUrl(value, base || BASE_URL + '/');
	if (!url || /^data:/i.test(url)) {
		return '';
	}
	return url.replace(/^http:\/\//i, 'https://');
}

function requestHeaders(referer) {
	return {
		Referer: referer || BASE_URL + '/',
		Origin: BASE_URL,
		Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json,text/plain,*/*;q=0.8',
		'User-Agent': 'Mozilla/5.0'
	};
}

async function requestText(url, referer) {
	const requestUrl = normalizeUrl(url);
	const text = await rulia().httpRequest({
		url: requestUrl,
		method: 'GET',
		headers: requestHeaders(referer),
		timeout: REQUEST_TIMEOUT
	});
	if (/Just a moment|cf_chl|Enable JavaScript and cookies/i.test(String(text || ''))) {
		throw new Error('Cloudflare challenge');
	}
	return text;
}

function parseFilterOptions(rawFilterOptions) {
	if (!rawFilterOptions) {
		return {};
	}
	if (typeof rawFilterOptions !== 'string') {
		return rawFilterOptions || {};
	}
	try {
		return JSON.parse(rawFilterOptions) || {};
	} catch (_) {
		return {};
	}
}

function sitePagesForRequest(page, pageSize) {
	const requestedSize = Math.max(1, parseInt(pageSize, 10) || SITE_PAGE_SIZE);
	const count = Math.max(1, Math.ceil(requestedSize / SITE_PAGE_SIZE));
	const start = (Math.max(1, parseInt(page, 10) || 1) - 1) * count + 1;
	const pages = [];
	for (let i = 0; i < count; i++) {
		pages.push(start + i);
	}
	return pages;
}

function buildListUrl(page, filterOptions) {
	const pageNo = Math.max(1, parseInt(page, 10) || 1);
	const category = filterOptions.category || '';
	return BASE_URL + '/albums-index-page-' + pageNo + (category ? '-cate-' + encodeURIComponent(category) : '') + '.html';
}

function buildSearchUrl(page, keyword) {
	const params = new URLSearchParams();
	params.set('q', keyword);
	params.set('m', '');
	params.set('f', '_all');
	params.set('s', 'create_time_DESC');
	params.set('p', String(Math.max(1, parseInt(page, 10) || 1)));
	return BASE_URL + '/search/index.php?' + params.toString();
}

function aidFromUrl(url) {
	return (String(url || '').match(/photos-(?:index|slide|item)(?:-page-\d+)?-aid-(\d+)\.html/i) || [])[1] || '';
}

function slideUrlFromAid(aid) {
	return BASE_URL + '/photos-slide-aid-' + encodeURIComponent(aid) + '.html';
}

function itemUrlFromAid(aid) {
	return BASE_URL + '/photos-item-aid-' + encodeURIComponent(aid) + '.html';
}

function indexUrlFromAid(aid) {
	return BASE_URL + '/photos-index-aid-' + encodeURIComponent(aid) + '.html';
}

function parseMangaList(html) {
	const result = [];
	const seen = {};
	const itemRe = /<li\b[^>]*>([\s\S]*?photos-index-aid-\d+\.html[\s\S]*?)<\/li>/gi;
	let match;
	while ((match = itemRe.exec(html || '')) !== null) {
		const block = match[1];
		const link = (block.match(/<a\b[^>]*href=["']([^"']*photos-index-aid-\d+\.html)["'][^>]*>/i) || [])[1];
		const url = link ? absoluteUrl(link) : '';
		const aid = aidFromUrl(url);
		if (!aid || seen[aid]) {
			continue;
		}
		const img = (block.match(/<img\b[^>]*>/i) || [''])[0];
		const titleLink = (block.match(/<div\b[^>]*class=["'][^"']*\btitle\b[^"']*["'][^>]*>[\s\S]*?<a\b[^>]*>/i) || [])[0];
		const title = attr(titleLink, 'title')
			|| attr(img, 'alt')
			|| stripTags((block.match(/<div\b[^>]*class=["'][^"']*\btitle\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) || [])[1])
			|| stripTags((block.match(/<a\b[^>]*href=["'][^"']*photos-index-aid-\d+\.html["'][^>]*>([\s\S]*?)<\/a>/i) || [])[1]);
		if (!title) {
			continue;
		}
		seen[aid] = true;
		result.push({
			title,
			url: indexUrlFromAid(aid),
			coverUrl: cleanImageUrl(attr(img, 'data-original') || attr(img, 'data-src') || attr(img, 'src')) || FALLBACK_COVER,
			latestChapter: stripTags((block.match(/<div\b[^>]*class=["'][^"']*\binfo_col\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) || [])[1])
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

function parseTitle(html, fallback) {
	return stripTags((html.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i) || [])[1])
		|| stripTags((html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || [])[1])
		|| stripTags((html.match(/<div\b[^>]*class=["'][^"']*\btitle\b[^"']*["'][^>]*>[\s\S]*?<span\b[^>]*class=["'][^"']*\bname\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) || [])[1])
		|| decodeHtml((html.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i) || [])[1]).replace(/\s*-\s*紳士漫畫.*$/i, '')
		|| stripTags((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1]).replace(/\s*-\s*紳士漫畫.*$/i, '')
		|| fallback
		|| '紳士漫畫';
}

function parseDescription(html) {
	const category = stripTags((html.match(/分類[：:]?\s*([\s\S]*?)(?:頁數|標籤|簡介|<\/)/i) || [])[1]);
	const pages = stripTags((html.match(/頁數[：:]?\s*([\s\S]*?)(?:標籤|簡介|<\/)/i) || [])[1]);
	const tags = stripTags((html.match(/標籤[：:]?\s*([\s\S]*?)(?:簡介|<\/)/i) || [])[1]).replace(/\+TAG$/i, '');
	const intro = stripTags((html.match(/簡介[：:]?\s*([\s\S]*?)(?:<div\b[^>]*class=["'][^"']*\basTBcell\b|<ul\b[^>]*class=["'][^"']*\bcc\b|投搞作品|<\/body>)/i) || [])[1]);
	const meta = decodeHtml((html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) || [])[1]);
	return [
		intro || meta,
		category ? '分類：' + category : '',
		pages ? '頁數：' + pages : '',
		tags ? '標籤：' + tags : ''
	].filter(Boolean).join('\n');
}

function parseCover(html) {
	const og = cleanImageUrl((html.match(/<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) || [])[1]);
	if (og) {
		return og;
	}
	const conn = (html.match(/<div\b[^>]*class=["'][^"']*\buwconn\b[^"']*["'][^>]*>[\s\S]*?<img\b[^>]*>/i) || [''])[0];
	return cleanImageUrl(attr(conn, 'data-original') || attr(conn, 'data-src') || attr(conn, 'src')) || FALLBACK_COVER;
}

function parseTotalPages(html) {
	const text = stripTags((html.match(/頁數[：:]?\s*([\s\S]*?)(?:P|張|<)/i) || [])[1]);
	return Math.max(0, parseInt(text, 10) || 0);
}

function parseImageArrayFromItemScript(text) {
	const result = [];
	const seen = {};
	const source = String(text || '');
	const pageUrlMatch = source.match(/"page_url"\s*:\s*\[([\s\S]*?)\]/);
	const listSource = pageUrlMatch ? pageUrlMatch[1] : source;
	const quotedRe = /"([^"]+)"/g;
	let match;
	while ((match = quotedRe.exec(listSource)) !== null) {
		const url = cleanImageUrl(match[1].replace(/\\\//g, '/'));
		if (/^https?:\/\//i.test(url) && !seen[url]) {
			seen[url] = true;
			result.push({ url, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
		}
	}
	if (result.length) {
		return result;
	}
	const urlRe = /\/\/[^"',\]\s<>]+/g;
	while ((match = urlRe.exec(source)) !== null) {
		const url = cleanImageUrl(match[0].replace(/\\/g, ''));
		if (/^https?:\/\//i.test(url) && !seen[url]) {
			seen[url] = true;
			result.push({ url, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
		}
	}
	return result;
}

async function setMangaListFilterOptions() {
	finish([
		{ label: '分类', name: 'category', options: CATEGORIES }
	]);
}

async function getMangaList(page, pageSize, keyword, rawFilterOptions) {
	try {
		const filterOptions = parseFilterOptions(rawFilterOptions);
		const pages = sitePagesForRequest(page, pageSize);
		const results = [];
		const query = String(keyword || '').trim();
		for (let i = 0; i < pages.length; i++) {
			const url = query ? buildSearchUrl(pages[i], query) : buildListUrl(pages[i], filterOptions);
			const parsed = parseMangaList(await requestText(url));
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
		const url = normalizeUrl(dataPageUrl);
		const aid = aidFromUrl(url);
		if (!aid) {
			throw new Error('无法识别作品 aid。');
		}
		const cacheKey = indexUrlFromAid(aid);
		if (mangaDataCache[cacheKey]) {
			finish(mangaDataCache[cacheKey]);
			return;
		}
		const html = await requestText(cacheKey);
		const title = parseTitle(html, '紳士漫畫');
		const totalPages = parseTotalPages(html);
		const result = {
			title,
			description: parseDescription(html),
			coverUrl: parseCover(html),
			chapterList: [
				{
					title: totalPages ? '全篇（' + totalPages + 'P）' : '全篇',
					url: slideUrlFromAid(aid)
				}
			]
		};
		mangaDataCache[cacheKey] = result;
		finish(result);
	} catch (error) {
		fail(error);
	}
}

async function getChapterImageList(chapterUrl) {
	try {
		const url = normalizeUrl(chapterUrl);
		const aid = aidFromUrl(url);
		if (!aid) {
			throw new Error('无法识别章节 aid。');
		}
		const cacheKey = itemUrlFromAid(aid);
		if (chapterImageCache[cacheKey]) {
			finish(chapterImageCache[cacheKey]);
			return;
		}
		const text = await requestText(cacheKey, slideUrlFromAid(aid));
		const images = parseImageArrayFromItemScript(text);
		if (!images.length) {
			throw new Error('无法解析章节图片。');
		}
		chapterImageCache[cacheKey] = images;
		finish(images);
	} catch (error) {
		fail(error);
	}
}

async function getImageUrl(path) {
	finish(path);
}
