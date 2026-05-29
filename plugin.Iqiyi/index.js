const BASE_URL = 'https://www.iqiyi.com';
const MANHUA_URL = BASE_URL + '/manhua';
const FALLBACK_COVER = 'https://www.iqiyipic.com/common/fix/public/prop-img.jpg';
const DEFAULT_IMAGE_WIDTH = 800;
const DEFAULT_IMAGE_HEIGHT = 1200;
const SITE_PAGE_SIZE = 24;
const REQUEST_TIMEOUT = 15000;

const mangaDataCache = {};
const chapterImageCache = {};

const CATEGORIES = [
	{ label: '全部', value: '全部' },
	{ label: '恋爱', value: '恋爱' },
	{ label: '古装', value: '古装' },
	{ label: '玄幻', value: '玄幻' },
	{ label: '悬疑', value: '悬疑' },
	{ label: '科幻', value: '科幻' },
	{ label: '搞笑', value: '搞笑' },
	{ label: '热血', value: '热血' },
	{ label: '都市', value: '都市' },
	{ label: '校园', value: '校园' },
	{ label: '治愈', value: '治愈' },
	{ label: '竞技', value: '竞技' },
	{ label: '冒险', value: '冒险' }
];

const STATUSES = [
	{ label: '全部', value: '-1' },
	{ label: '连载', value: '2' },
	{ label: '完结', value: '1' }
];

const PAY_TYPES = [
	{ label: '全部', value: '-1' },
	{ label: '免费', value: '0' },
	{ label: '付费', value: '2' }
];

const SORTS = [
	{ label: '人气最高', value: '9' },
	{ label: '最近更新', value: '4' },
	{ label: '最新上线', value: '14' }
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
		rdquo: '”',
		lsquo: '‘',
		rsquo: '’'
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
		Referer: referer ? normalizeRequestUrl(referer) : MANHUA_URL + '/',
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
	const text = await requestText(url, referer);
	return JSON.parse(text);
}

function cleanImageUrl(url) {
	const imageUrl = decodeHtml(url || '');
	if (!imageUrl || /^data:/i.test(imageUrl) || /prop-img\.jpg/i.test(imageUrl)) {
		return '';
	}
	return absoluteUrl(imageUrl).replace(/^http:\/\//i, 'https://');
}

function upsertManga(map, item) {
	if (!item || !item.url) {
		return;
	}
	const old = map[item.url] || {};
	map[item.url] = {
		title: item.title || old.title || '',
		url: item.url,
		coverUrl: item.coverUrl || old.coverUrl || FALLBACK_COVER
	};
}

function parseSearchList(html) {
	const map = {};
	const blockRe = /<li\b[^>]*class=["'][^"']*\bstacksBook\b[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi;
	let match;
	while ((match = blockRe.exec(html || '')) !== null) {
		const block = match[1];
		const coverLink = block.match(/<a\b[^>]*href=["']([^"']*\/manhua\/detail_[^"']+\.html)["'][^>]*>\s*<img\b[^>]*>/i);
		const titleLink = block.match(/<h3\b[^>]*class=["'][^"']*\bstacksBook-tit\b[^"']*["'][^>]*>[\s\S]*?<a\b[^>]*href=["']([^"']*\/manhua\/detail_[^"']+\.html)["'][^>]*>([\s\S]*?)<\/a>/i);
		const imgHtml = (block.match(/<img\b[^>]*>/i) || [])[0] || '';
		const url = absoluteUrl((titleLink && titleLink[1]) || (coverLink && coverLink[1]) || '');
		const title = attr((titleLink || [])[0], 'title') || stripTags((titleLink || [])[2]) || attr(imgHtml, 'alt');
		upsertManga(map, {
			title,
			url,
			coverUrl: cleanImageUrl(attr(imgHtml, 'src') || attr(imgHtml, 'data-original'))
		});
	}
	return { list: Object.keys(map).map(url => map[url]).filter(item => item.title) };
}

function parseMangaList(html) {
	const searched = parseSearchList(html);
	if (searched.list.length) {
		return searched;
	}

	const map = {};
	const linkRe = /<a\b[^>]*href=["']([^"']*\/manhua\/detail_[^"']+\.html)["'][^>]*>([\s\S]*?)<\/a>/gi;
	let match;
	while ((match = linkRe.exec(html || '')) !== null) {
		const tag = match[0];
		const href = match[1];
		const body = match[2];
		const imgHtml = (body.match(/<img\b[^>]*>/i) || [])[0] || '';
		const title = attr(tag, 'title') || attr(imgHtml, 'alt') || stripTags(body).replace(/^\d+/, '').replace(/\s*\d+(?:\.\d+)?亿.*$/, '');
		const coverUrl = cleanImageUrl(attr(imgHtml, 'src') || attr(imgHtml, 'data-original'));
		if (!title || /^(首页|分类|我的书架|动画|作者中心|下载APP|更多|全部)$/.test(title)) {
			continue;
		}
		upsertManga(map, {
			title,
			url: absoluteUrl(href),
			coverUrl
		});
	}

	return { list: Object.keys(map).map(url => map[url]).filter(item => item.title) };
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
	const category = encodeURIComponent(filterOptions.category || '全部');
	const status = filterOptions.status || '-1';
	const pay = filterOptions.pay || '-1';
	const sort = filterOptions.sort || '9';
	return MANHUA_URL + '/category/' + category + '_' + status + '_' + pay + '_' + sort + '_' + (page || 1) + '/';
}

function buildSearchUrl(keyword) {
	return MANHUA_URL + '/search-keyword=' + encodeURIComponent(keyword);
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

function parseComicId(url, html) {
	return (String(url || '').match(/\/detail_([^/.]+)\.html/i) || [])[1]
		|| ((html || '').match(/comicId\s*[:=]\s*["']([^"']+)["']/i) || [])[1]
		|| '';
}

function parseTitle(html, fallback) {
	return stripTags((html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || [])[1])
		|| decodeHtml((html.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i) || [])[1]).replace(/[《》]/g, '').replace(/[-_].*$/, '')
		|| fallback
		|| '爱奇艺叭嗒';
}

function parseDescription(html) {
	const author = stripTags((html.match(/<p\b[^>]*>\s*作者\s*([\s\S]*?)<\/p>/i) || [])[1]);
	const brief = stripTags((html.match(/<p\b[^>]*class=["'][^"']*\bintro\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i) || [])[1])
		|| stripTags((html.match(/<div\b[^>]*class=["'][^"']*\bintro\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) || [])[1])
		|| decodeHtml((html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) || [])[1]);
	return [author ? '作者：' + author : '', brief].filter(Boolean).join(' · ');
}

function parseCover(html) {
	const detailCover = (html.match(/<img\b[^>]*class=["'][^"']*(?:cartoon|comic|cover|book)[^"']*["'][^>]*src=["']([^"']+)["'][^>]*>/i) || [])[1]
		|| (html.match(/<img\b[^>]*src=["']([^"']+)["'][^>]*alt=["'][^"']+["'][^>]*>/i) || [])[1];
	return cleanImageUrl((html.match(/comicPic\s*:\s*["']([^"']+)["']/i) || [])[1])
		|| cleanImageUrl(detailCover)
		|| cleanImageUrl((html.match(/<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i) || [])[1])
		|| FALLBACK_COVER;
}

function chapterTitle(episode) {
	const order = episode.episodeOrder || episode.order || '';
	const title = episode.episodeTitle || episode.title || '';
	if (title && order && String(title) !== String(order)) {
		return '第' + order + '话 ' + title;
	}
	return title ? '第' + title + '话' : (order ? '第' + order + '话' : '章节');
}

async function parseCatalogChapterList(comicId, referer) {
	const json = await requestJson(MANHUA_URL + '/catalog/' + comicId + '/', referer);
	const episodes = json && json.data && json.data.episodes;
	if (!Array.isArray(episodes) || !episodes.length) {
		return [];
	}
	return episodes.map(episode => ({
		title: chapterTitle(episode),
		url: MANHUA_URL + '/reader/' + comicId + '_' + episode.episodeId + '.html'
	})).filter(item => item.url.indexOf('undefined') < 0);
}

async function requestCatalogData(comicId, referer) {
	const json = await requestJson(MANHUA_URL + '/catalog/' + comicId + '/', referer);
	return json && json.data ? json.data : {};
}

function parseHtmlChapterList(html) {
	const result = [];
	const seen = {};
	const chapterRe = /<a\b[^>]*href=["']([^"']*\/manhua\/reader\/[^"']+\.html)["'][^>]*>([\s\S]*?)<\/a>/gi;
	let match;
	while ((match = chapterRe.exec(html || '')) !== null) {
		const url = absoluteUrl(match[1]);
		if (seen[url] || /开始阅读/.test(match[2])) {
			continue;
		}
		seen[url] = true;
		result.push({
			title: stripTags(match[2]).replace(/\s+/g, ' ') || '章节',
			url
		});
	}
	return result;
}

function parseChapterImages(html) {
	const result = [];
	const seen = {};
	const imgRe = /<li\b[^>]*class=["'][^"']*\bmain-item\b[^"']*["'][^>]*>\s*<img\b([^>]*)>/gi;
	let match;
	while ((match = imgRe.exec(html || '')) !== null) {
		const tag = '<img ' + match[1] + '>';
		const url = cleanImageUrl(attr(tag, 'data-original') || attr(tag, 'src'));
		if (!url || seen[url]) {
			continue;
		}
		seen[url] = true;
		const style = attr(tag, 'style');
		const width = parseInt((style.match(/width\s*:\s*(\d+)px/i) || [])[1], 10) || parseInt(attr(tag, 'data-w'), 10) || DEFAULT_IMAGE_WIDTH;
		const height = parseInt((style.match(/height\s*:\s*(\d+)px/i) || [])[1], 10) || parseInt(attr(tag, 'data-h'), 10) || DEFAULT_IMAGE_HEIGHT;
		result.push({ url, width, height });
	}
	return result;
}

async function setMangaListFilterOptions() {
	window.Rulia.endWithResult([
		{ label: '题材', name: 'category', options: CATEGORIES },
		{ label: '状态', name: 'status', options: STATUSES },
		{ label: '付费', name: 'pay', options: PAY_TYPES },
		{ label: '排序', name: 'sort', options: SORTS }
	]);
}

async function getMangaList(page, pageSize, keyword, rawFilterOptions) {
	try {
		const filterOptions = parseFilterOptions(rawFilterOptions);
		if (keyword) {
			const html = await requestText(buildSearchUrl(keyword));
			let parsed = parseMangaList(html);
			const size = Number(pageSize) > 0 ? Number(pageSize) : 30;
			const start = Math.max(0, (Number(page) || 1) - 1) * size;
			parsed = { list: parsed.list.slice(start, start + size) };
			window.Rulia.endWithResult(parsed);
			return;
		}
		const pages = sitePagesForRequest(page, pageSize);
		const results = [];
		for (let i = 0; i < pages.length; i++) {
			const html = await requestText(buildListUrl(pages[i], filterOptions));
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
		const html = await requestText(mangaUrl, mangaUrl);
		const comicId = parseComicId(mangaUrl, html);
		let catalogData = {};
		let chapterList = [];
		if (comicId) {
			catalogData = await requestCatalogData(comicId, mangaUrl);
			const episodes = catalogData.episodes;
			if (Array.isArray(episodes)) {
				chapterList = episodes.map(episode => ({
					title: chapterTitle(episode),
					url: MANHUA_URL + '/reader/' + comicId + '_' + episode.episodeId + '.html'
				})).filter(item => item.url.indexOf('undefined') < 0);
			}
		}
		if (!chapterList.length) {
			chapterList = parseHtmlChapterList(html);
		}
		if (!chapterList.length) {
			throw new Error('无法解析章节目录。');
		}
		const result = {
			title: parseTitle(html),
			description: parseDescription(html),
			coverUrl: cleanImageUrl(catalogData.pic) || parseCover(html),
			chapterList
		};
		mangaDataCache[mangaUrl] = result;
		window.Rulia.endWithResult(result);
	} catch (error) {
		window.Rulia.endWithException(error.message);
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
		if (!result.length && /authPass\s*:\s*["']0["']/.test(html)) {
			throw new Error('该章节需要站点授权或购买后阅读。');
		}
		if (!result.length) {
			throw new Error('无法解析章节图片。');
		}
		chapterImageCache[normalizedChapterUrl] = result;
		window.Rulia.endWithResult(result);
	} catch (error) {
		window.Rulia.endWithException(error.message);
	}
}

async function getImageUrl(path) {
	window.Rulia.endWithResult(path);
}
