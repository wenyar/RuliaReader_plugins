const BASE_URL = 'https://www.dongmanmanhua.cn';
const FALLBACK_COVER = 'https://cdn-static.dongmanmanhua.cn/image/dongman/pc/logo_dongman.png';
const REQUEST_TIMEOUT = 15000;

const mangaDataCache = {};
const chapterImageCache = {};
const CHAPTER_PAGE_PROBE = 9999;
const CHAPTER_LIST_CONCURRENCY = 6;

const CATEGORIES = [
	{ label: '全部', value: '' },
	{ label: '排行榜', value: 'top:ALL' },
	{ label: '周一更新', value: 'daily:MONDAY' },
	{ label: '周二更新', value: 'daily:TUESDAY' },
	{ label: '周三更新', value: 'daily:WEDNESDAY' },
	{ label: '周四更新', value: 'daily:THURSDAY' },
	{ label: '周五更新', value: 'daily:FRIDAY' },
	{ label: '周六更新', value: 'daily:SATURDAY' },
	{ label: '周日更新', value: 'daily:SUNDAY' },
	{ label: '连载作品', value: 'daily:ONGOING' },
	{ label: '完结作品', value: 'daily:COMPLETED' },
	{ label: '恋爱', value: 'LOVE' },
	{ label: '少年', value: 'BOY' },
	{ label: '古风', value: 'ANCIENTCHINESE' },
	{ label: '奇幻', value: 'FANTASY' },
	{ label: '搞笑', value: 'COMEDY' },
	{ label: '校园', value: 'CAMPUS' },
	{ label: '都市', value: 'DRAMA' },
	{ label: '治愈', value: 'HEALING' },
	{ label: '悬疑', value: 'SUSPENSE' },
	{ label: '励志', value: 'INSPIRING' },
	{ label: '影视化', value: 'FILMADAPTATION' },
	{ label: '完结', value: 'TERMINATION' }
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

async function requestText(url, referer) {
	return await window.Rulia.httpRequest({
		url: normalizeRequestUrl(url),
		method: 'GET',
		headers: requestHeaders(referer),
		timeout: REQUEST_TIMEOUT
	});
}

function cleanImageUrl(url) {
	const imageUrl = decodeHtml(url || '');
	if (!imageUrl) {
		return '';
	}
	return absoluteUrl(imageUrl).replace(/^http:\/\/cdn-/i, 'https://cdn-').replace(/^http:\/\/cdn\./i, 'https://cdn.');
}

function parseCardBlock(block, href) {
	const imgHtml = (block.match(/<img\b[^>]*>/i) || [])[0] || '';
	const title = stripTags((block.match(/<p\b[^>]*class=["'][^"']*\bsubj\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i) || [])[1])
		|| attr(imgHtml, 'alt')
		|| stripTags(block).replace(/^(?:\d+\s*)?/, '').split(' ')[0];
	const author = stripTags((block.match(/<p\b[^>]*class=["'][^"']*\bauthor\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i) || [])[1]);
	const coverUrl = cleanImageUrl(attr(imgHtml, 'src') || attr(imgHtml, 'data-url')) || FALLBACK_COVER;
	return title ? {
		title: author ? title + ' - ' + author : title,
		url: absoluteUrl(href),
		coverUrl
	} : null;
}

function parseMangaList(html, category) {
	let source = html || '';
	if (category) {
		const marker = new RegExp('<h2\\b[^>]*data-genre=["\\\']' + category + '["\\\'][^>]*>[\\s\\S]*?<\\/h2>', 'i');
		const markerMatch = marker.exec(source);
		if (markerMatch) {
			const start = markerMatch.index;
			const rest = source.slice(start + markerMatch[0].length);
			const next = rest.search(/<h2\b[^>]*data-genre=/i);
			source = rest.slice(0, next >= 0 ? next : undefined);
		}
	}

	const result = [];
	const seen = {};
	const cardRe = /<a\b[^>]*href=["']([^"']*\/list\?title_no=\d+[^"']*)["'][^>]*class=["'][^"']*(?:\bcard_item\b|\bdaily_card_item\b)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
	let match;
	while ((match = cardRe.exec(source)) !== null) {
		const item = parseCardBlock(match[2], match[1]);
		if (item && !seen[item.url]) {
			seen[item.url] = true;
			result.push(item);
		}
	}
	if (!result.length) {
		const linkRe = /<a\b[^>]*href=["']([^"']*\/list\?title_no=\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
		while ((match = linkRe.exec(source)) !== null) {
			const item = parseCardBlock(match[2], match[1]);
			if (item && !seen[item.url]) {
				seen[item.url] = true;
				result.push(item);
			}
		}
	}
	return { list: result };
}

function parseDailyList(html, day) {
	let source = html || '';
	if (day && day !== 'ALL') {
		let sectionRe;
		if (day === 'ONGOING' || day === 'COMPLETED') {
			const id = day === 'ONGOING' ? 'ongoing' : 'completed';
			sectionRe = new RegExp('<h2\\b[^>]*id=["\\\']' + id + '["\\\'][\\s\\S]*?(?=<h2\\b[^>]*id=["\\\'](?:ongoing|completed)["\\\']|$)', 'i');
		} else {
			sectionRe = new RegExp('<div\\b[^>]*class=["\\\'][^"\\\']*_list_' + day + '\\b[\\s\\S]*?(?=<div\\b[^>]*class=["\\\'][^"\\\']*_list_|<h2\\b[^>]*id=["\\\']completed["\\\']|$)', 'i');
		}
		source = (source.match(sectionRe) || [source])[0];
	}
	return parseMangaList(source);
}

function parseSearchList(html) {
	const parsed = parseMangaList(html);
	if (parsed.list.length) {
		return parsed;
	}
	const result = [];
	const seen = {};
	const linkRe = /<a\b[^>]*href=["']([^"']*\/list\?title_no=\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
	let match;
	while ((match = linkRe.exec(html || '')) !== null) {
		const item = parseCardBlock(match[2], match[1]);
		if (item && !seen[item.url]) {
			seen[item.url] = true;
			result.push(item);
		}
	}
	return { list: result };
}

function pageSlice(items, page, pageSize) {
	const size = Number(pageSize) > 0 ? Number(pageSize) : 30;
	const start = Math.max(0, (Number(page) || 1) - 1) * size;
	return items.slice(start, start + size);
}

function setQueryParam(url, name, value) {
	const parsed = new URL(url);
	parsed.searchParams.set(name, value);
	return parsed.toString();
}

function extractCurrentPage(html) {
	return parseInt((html.match(/<span\b[^>]*class=["']on["'][^>]*>(\d+)<\/span>/i) || [])[1], 10) || 1;
}

function extractMaxLinkedPage(html) {
	let maxPage = extractCurrentPage(html);
	(html || '').replace(/[?&]page=(\d+)/g, (_, page) => {
		maxPage = Math.max(maxPage, parseInt(page, 10) || 1);
		return '';
	});
	return maxPage;
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

async function mapWithConcurrency(items, concurrency, worker) {
	const result = new Array(items.length);
	let nextIndex = 0;
	const workers = [];
	const workerCount = Math.min(concurrency, items.length);
	for (let i = 0; i < workerCount; i++) {
		workers.push((async () => {
			while (nextIndex < items.length) {
				const currentIndex = nextIndex++;
				result[currentIndex] = await worker(items[currentIndex], currentIndex);
			}
		})());
	}
	await Promise.all(workers);
	return result;
}

function parseTitle(html, fallback) {
	return stripTags((html.match(/<h1\b[^>]*class=["'][^"']*\bsubj\b[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i) || [])[1])
		|| decodeHtml((html.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i) || [])[1])
		|| fallback
		|| '咚漫漫画';
}

function parseDescription(html) {
	return stripTags((html.match(/<p\b[^>]*class=["'][^"']*\bsummary\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i) || [])[1])
		|| decodeHtml((html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) || [])[1]);
}

function parseCover(html) {
	const bodyCover = (html.match(/<div\b[^>]*class=["'][^"']*\bdetail_body\b[^"']*["'][^>]*style=["'][^"']*url\(([^)]+)\)/i) || [])[1];
	const headerImg = html.match(/<span\b[^>]*class=["'][^"']*\bthmb\b[^"']*["'][^>]*>\s*(<img\b[^>]*>)/i);
	return cleanImageUrl(bodyCover)
		|| cleanImageUrl((html.match(/<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i) || [])[1])
		|| cleanImageUrl(attr((headerImg || [])[1], 'src'))
		|| FALLBACK_COVER;
}

function parseChapterList(html) {
	const chapters = [];
	const seen = {};
	const listHtml = (html.match(/<ul\b[^>]*id=["']_listUl["'][^>]*>([\s\S]*?)<\/ul>/i) || [])[1] || html;
	const chapterRe = /<li\b[^>]*data-episode-no=["']?(\d+)["']?[^>]*>[\s\S]*?<a\b[^>]*href=["']([^"']*\/viewer\?title_no=\d+&episode_no=\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/li>/gi;
	let match;
	while ((match = chapterRe.exec(listHtml)) !== null) {
		const url = absoluteUrl(match[2]);
		if (seen[url]) {
			continue;
		}
		seen[url] = true;
		const block = match[3];
		const title = stripTags((block.match(/<span\b[^>]*class=["'][^"']*\bsubj\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) || [])[1])
			|| stripTags(block).replace(/\s*(?:UP\s*)?\d{4}-\d{1,2}-\d{1,2}.*$/, '')
			|| '第 ' + match[1] + ' 话';
		chapters.push({ title, url });
	}
	return chapters.reverse();
}

async function parseFullChapterList(mangaUrl, firstHtml) {
	let maxPage = extractMaxLinkedPage(firstHtml);
	try {
		const lastPageHtml = await requestText(setQueryParam(mangaUrl, 'page', String(CHAPTER_PAGE_PROBE)), mangaUrl);
		maxPage = Math.max(maxPage, extractCurrentPage(lastPageHtml), extractMaxLinkedPage(lastPageHtml));
	} catch (_) {}
	if (maxPage <= 1) {
		return parseChapterList(firstHtml);
	}

	const pages = [];
	for (let page = 1; page <= maxPage; page++) {
		pages.push(page);
	}
	const chunks = await mapWithConcurrency(pages, CHAPTER_LIST_CONCURRENCY, async (page) => {
		const html = page === 1 ? firstHtml : await requestText(setQueryParam(mangaUrl, 'page', String(page)), mangaUrl);
		return parseChapterList(html);
	});
	const chapterList = [];
	const seen = {};
	for (let i = chunks.length - 1; i >= 0; i--) {
		for (const chapter of chunks[i]) {
			if (!seen[chapter.url]) {
				seen[chapter.url] = true;
				chapterList.push(chapter);
			}
		}
	}
	return chapterList;
}

function parseImages(html) {
	const result = [];
	const imageRe = /<img\b[^>]*class=["'][^"']*\b_images\b[^"']*["'][^>]*>/gi;
	let match;
	while ((match = imageRe.exec(html || '')) !== null) {
		const tag = match[0];
		const url = cleanImageUrl(attr(tag, 'data-url') || attr(tag, 'src'));
		if (!url || /bg_transparency\.png/i.test(url)) {
			continue;
		}
		result.push({
			url,
			width: parseInt(attr(tag, 'width'), 10) || 800,
			height: parseInt(attr(tag, 'height'), 10) || 1200
		});
	}
	return result;
}

async function setMangaListFilterOptions() {
	window.Rulia.endWithResult([
		{ label: '分类', name: 'category', options: CATEGORIES }
	]);
}

async function getMangaList(page, pageSize, keyword, rawFilterOptions) {
	try {
		const filterOptions = parseFilterOptions(rawFilterOptions);
		const category = filterOptions.category || '';
		const isDaily = category.indexOf('daily:') === 0;
		const isTop = category.indexOf('top:') === 0;
		const url = keyword ? BASE_URL + '/search?keyword=' + encodeURIComponent(keyword) : (isDaily ? BASE_URL + '/dailySchedule' : (isTop ? BASE_URL + '/top' : BASE_URL + '/genre'));
		const html = await requestText(url);
		const parsed = keyword ? parseSearchList(html) : (isDaily ? parseDailyList(html, category.replace(/^daily:/, '')) : parseMangaList(html, isTop ? '' : category));
		window.Rulia.endWithResult({ list: pageSlice(parsed.list, page, pageSize) });
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
		const html = await requestText(mangaUrl);
		const result = {
			title: parseTitle(html),
			description: parseDescription(html),
			coverUrl: parseCover(html),
			chapterList: await parseFullChapterList(mangaUrl, html)
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
		const result = parseImages(html);
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
