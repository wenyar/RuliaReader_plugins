const BASE_URL = 'https://www.e728.com';
const FALLBACK_COVER = 'https://comic.5um.net/comic/cover/fengnitianxia.webp';
const SITE_PAGE_SIZE = 20;
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 1200;
const REQUEST_TIMEOUT = 20000;

const mangaDataCache = {};
const chapterImageCache = {};
const listMaxPageCache = {};
const singlePageServedCache = {};
let listPageBase = null;

const BAD_COVER_PATHS = {
	'/comic/cover/jueshiwushen.webp': true,
	'/comic/cover/renya%e2%85%a1.webp': true,
	'/comic/cover/renyaⅱ.webp': true
};

const CATEGORIES = [
	{ label: '全部', value: '' },
	{ label: '热血', value: '6' },
	{ label: '冒险', value: '7' },
	{ label: '科幻', value: '8' },
	{ label: '霸总', value: '9' },
	{ label: '玄幻', value: '10' },
	{ label: '校园', value: '11' },
	{ label: '修真', value: '12' },
	{ label: '搞笑', value: '13' },
	{ label: '穿越', value: '14' },
	{ label: '后宫', value: '15' },
	{ label: '耽美', value: '16' },
	{ label: '恋爱', value: '17' },
	{ label: '悬疑', value: '18' },
	{ label: '恐怖', value: '19' },
	{ label: '动作', value: '21' },
	{ label: '百合', value: '27' },
	{ label: '都市', value: '31' },
	{ label: '日漫', value: '105' },
	{ label: '韩漫', value: '74' },
	{ label: '完结', value: '113' }
];

const ENTRIES = [
	{ label: '分类浏览', value: 'category' },
	{ label: '最新更新', value: 'new' },
	{ label: '热门推荐', value: 'recom' },
	{ label: '排行榜', value: 'top' },
	{ label: '完结漫画', value: 'end' }
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
		mdash: '-'
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

function isBadCover(url) {
	if (!url) {
		return true;
	}
	try {
		const path = new URL(url).pathname.toLowerCase();
		return !!BAD_COVER_PATHS[path];
	} catch (_) {
		return false;
	}
}

function coverUrl(value, base) {
	const url = cleanImageUrl(value, base);
	return isBadCover(url) ? FALLBACK_COVER : url;
}

function detailCoverUrl(value, base) {
	const url = cleanImageUrl(value, base);
	return isBadCover(url) ? '' : url;
}

async function requestText(url, referer) {
	const requestUrl = normalizeUrl(url);
	return await rulia().httpRequest({
		url: requestUrl,
		method: 'GET',
		headers: {
			Referer: referer || BASE_URL + '/',
			Origin: BASE_URL,
			'User-Agent': 'Mozilla/5.0'
		},
		timeout: REQUEST_TIMEOUT
	});
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
	return [requestPageIndex(page) + 1];
}

function requestPageIndex(page) {
	const rawPage = parseInt(page, 10);
	if (listPageBase === null && rawPage === 0) {
		listPageBase = 0;
	}
	const pageNumber = Number.isFinite(rawPage) ? rawPage : (listPageBase === 0 ? 0 : 1);
	return listPageBase === 0 ? Math.max(0, pageNumber) : Math.max(0, pageNumber - 1);
}

function pagePath(basePath, page) {
	const pageNo = Math.max(1, parseInt(page, 10) || 1);
	if (pageNo <= 1) {
		return basePath;
	}
	return basePath.replace(/\/?$/, '/') + 'page/' + pageNo;
}

function buildListUrl(page, filterOptions) {
	const entry = filterOptions.entry || filterOptions.sort || 'category';
	if (entry && entry !== 'category') {
		return BASE_URL + pagePath('/custom/' + encodeURIComponent(entry), page);
	}
	const pathParts = ['/category'];
	if (filterOptions.order) {
		pathParts.push('order', encodeURIComponent(filterOptions.order));
	}
	if (filterOptions.status) {
		pathParts.push('finish', encodeURIComponent(filterOptions.status));
	}
	if (filterOptions.category) {
		pathParts.push('tags', encodeURIComponent(filterOptions.category));
	}
	return BASE_URL + pagePath(pathParts.join('/'), page);
}

function listCacheKey(filterOptions) {
	const entry = filterOptions.entry || filterOptions.sort || 'category';
	if (entry !== 'category') {
		return 'entry:' + entry;
	}
	return [
		'category',
		filterOptions.order || '',
		filterOptions.status || '',
		filterOptions.category || ''
	].join(':');
}

function isPagedList(filterOptions) {
	const entry = filterOptions.entry || filterOptions.sort || 'category';
	return !!filterOptions.category || entry === 'category';
}

function singlePageAlreadyServed(cacheKey, page) {
	const pageIndex = requestPageIndex(page);
	if (pageIndex > 0 || singlePageServedCache[cacheKey]) {
		return true;
	}
	singlePageServedCache[cacheKey] = true;
	return false;
}

function parseMaxPage(html) {
	let maxPage = 1;
	String(html || '').replace(/href=["'][^"']*\/category(?:\/[^"']*)?\/page\/(\d+)[^"']*["']/gi, (_, page) => {
		maxPage = Math.max(maxPage, parseInt(page, 10) || 1);
		return '';
	});
	return maxPage;
}

function parseCategoryOptions(html) {
	const start = String(html || '').indexOf('漫画类型');
	const end = String(html || '').indexOf('漫画状态');
	const block = start >= 0 && end > start ? String(html).slice(start, end) : '';
	const options = [{ label: '全部', value: '' }];
	const seen = { '': true };
	block.replace(/<a\b[^>]*href=["'][^"']*\/category(?:\/[^"']*)?\/tags\/(\d+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi, (_, value, labelHtml) => {
		const label = stripTags(labelHtml);
		if (label && !seen[value]) {
			seen[value] = true;
			options.push({ label, value });
		}
		return '';
	});
	return options.length > 1 ? options : CATEGORIES;
}

function buildSearchUrl(keyword) {
	const params = new URLSearchParams();
	params.set('key', keyword);
	return BASE_URL + '/search?' + params.toString();
}

function parseMangaList(html) {
	const result = [];
	const seen = {};
	const itemRe = /<(?:div|a)\b[^>]*class=["'][^"']*\bcomic-item\b[^"']*["'][^>]*>([\s\S]*?)(?=<(?:div|a)\b[^>]*class=["'][^"']*\bcomic-item\b|<div\b[^>]*class=["'][^"']*\bpagination\b|<\/section>|<\/main>|$)/gi;
	let match;
	while ((match = itemRe.exec(html || '')) !== null) {
		const block = match[0] + match[1];
		const link = (block.match(/<a\b[^>]*href=["']([^"']*\/comic_\d+\.html)["'][^>]*>/i) || [])[1];
		const url = link ? absoluteUrl(link) : '';
		if (!url || seen[url]) {
			continue;
		}
		const img = (block.match(/<img\b[^>]*>/i) || [''])[0];
		const title = attr((block.match(/<a\b[^>]*title=["'][^"']+["'][^>]*>/i) || [''])[0], 'title')
			|| attr(img, 'alt')
			|| stripTags((block.match(/<h3\b[^>]*>[\s\S]*?<a\b[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h3>/i) || [])[1])
			|| stripTags((block.match(/<h3\b[^>]*class=["'][^"']*\bcomic-title\b[^"']*["'][^>]*>([\s\S]*?)<\/h3>/i) || [])[1]);
		if (!title) {
			continue;
		}
		seen[url] = true;
		result.push({
			title,
			url,
			coverUrl: coverUrl(attr(img, 'data-src') || attr(img, 'src')),
			latestChapter: stripTags((block.match(/<span\b[^>]*class=["'][^"']*\bupdate-badge\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) || [])[1]),
			author: stripTags((block.match(/<p\b[^>]*class=["'][^"']*\bcomic-author\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i) || [])[1]),
			description: stripTags((block.match(/<p\b[^>]*class=["'][^"']*\bcomic-desc\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i) || [])[1])
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

function parseTitle(html) {
	return stripTags((html.match(/<div\b[^>]*class=["'][^"']*\bcomic-meta-info\b[^"']*["'][^>]*>[\s\S]*?<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || [])[1])
		|| decodeHtml((html.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i) || [])[1]).replace(/全集.*$/i, '')
		|| stripTags((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1]).replace(/详情.*$/i, '')
		|| '漫画屋';
}

function parseDescription(html) {
	const intro = stripTags((html.match(/<div\b[^>]*class=["'][^"']*\bcomic-description\b[^"']*["'][^>]*>[\s\S]*?<p\b[^>]*>([\s\S]*?)<\/p>/i) || [])[1]);
	const meta = decodeHtml((html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) || [])[1]);
	const author = stripTags((html.match(/作者[：:]\s*<\/?[^>]*>\s*([^<\n]+)/i) || [])[1])
		|| stripTags((html.match(/作者[：:]\s*([^<\n]+)/i) || [])[1]);
	const tags = [];
	String(html || '').replace(/<span\b[^>]*class=["'][^"']*\btag\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi, (_, tag) => {
		const text = stripTags(tag);
		if (text) {
			tags.push(text);
		}
		return '';
	});
	return [
		intro || meta,
		author ? '作者：' + author : '',
		tags.length ? '标签：' + tags.join(' / ') : ''
	].filter(Boolean).join('\n');
}

function parseCover(html) {
	const url = detailCoverUrl((html.match(/<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) || [])[1])
		|| detailCoverUrl((html.match(/<div\b[^>]*class=["'][^"']*\bcomic-cover-large\b[^"']*["'][^>]*>[\s\S]*?<img\b[^>]*src=["']([^"']+)["']/i) || [])[1]);
	return url || '';
}

function parseChapterList(html) {
	const chapterBox = (String(html || '').match(/<div\b[^>]*class=["'][^"']*\bchapter-list\b[^"']*["'][^>]*>([\s\S]*?)(?:<\/div>\s*<\/div>\s*<!--|<div\b[^>]*class=["'][^"']*\brelated-comics\b|$)/i) || [])[1] || html;
	const result = [];
	const seen = {};
	const re = /<a\b[^>]*href=["']([^"']*\/chapter_\d+_\d+\.html)["'][^>]*>([\s\S]*?)<\/a>/gi;
	let match;
	while ((match = re.exec(chapterBox)) !== null) {
		const url = absoluteUrl(match[1]);
		if (seen[url]) {
			continue;
		}
		seen[url] = true;
		result.push({ title: stripTags(match[2]) || '章节', url });
	}
	return result;
}

function parseChapterImages(html) {
	const result = [];
	const content = (String(html || '').match(/<div\b[^>]*class=["'][^"']*\bcomic-content\b[^"']*["'][^>]*>([\s\S]*?)(?:<div\b[^>]*class=["'][^"']*\breader-controls\b|$)/i) || [])[1] || html;
	const re = /<img\b[^>]*class=["'][^"']*\bcomic-image\b[^"']*["'][^>]*>/gi;
	let match;
	while ((match = re.exec(content)) !== null) {
		const imageUrl = cleanImageUrl(attr(match[0], 'data-src') || attr(match[0], 'src'));
		if (imageUrl) {
			result.push({ url: imageUrl, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
		}
	}
	return result;
}

async function setMangaListFilterOptions() {
	try {
		const categoryOptions = parseCategoryOptions(await requestText(BASE_URL + '/category/'));
		finish([
			{ label: '入口', name: 'entry', options: ENTRIES },
			{ label: '类型', name: 'category', options: categoryOptions },
			{ label: '状态', name: 'status', options: [
				{ label: '全部', value: '' },
				{ label: '连载中', value: '1' },
				{ label: '已完结', value: '2' }
			] },
			{ label: '排序', name: 'order', options: [
				{ label: '热门人气', value: 'hits' },
				{ label: '最新更新', value: 'addtime' }
			] }
		]);
	} catch (error) {
		finish([
			{ label: '入口', name: 'entry', options: ENTRIES },
			{ label: '类型', name: 'category', options: CATEGORIES },
			{ label: '状态', name: 'status', options: [
				{ label: '全部', value: '' },
				{ label: '连载中', value: '1' },
				{ label: '已完结', value: '2' }
			] },
			{ label: '排序', name: 'order', options: [
				{ label: '热门人气', value: 'hits' },
				{ label: '最新更新', value: 'addtime' }
			] }
		]);
	}
}

async function getMangaList(page, pageSize, keyword, rawFilterOptions) {
	try {
		const query = String(keyword || '').trim();
		if (query) {
			if (singlePageAlreadyServed('search:' + query, page)) {
				finish({ list: [] });
				return;
			}
			finish(parseMangaList(await requestText(buildSearchUrl(query))));
			return;
		}
		const filterOptions = parseFilterOptions(rawFilterOptions);
		const paged = isPagedList(filterOptions);
		const cacheKey = listCacheKey(filterOptions);
		if (!paged && singlePageAlreadyServed(cacheKey, page)) {
			finish({ list: [] });
			return;
		}
		const pages = sitePagesForRequest(page, pageSize);
		const results = [];
		for (let i = 0; i < pages.length; i++) {
			if (paged && listMaxPageCache[cacheKey] && pages[i] > listMaxPageCache[cacheKey]) {
				break;
			}
			const html = await requestText(buildListUrl(pages[i], filterOptions));
			if (paged) {
				const maxPage = parseMaxPage(html);
				listMaxPageCache[cacheKey] = Math.max(listMaxPageCache[cacheKey] || 1, maxPage);
				if (pages[i] > listMaxPageCache[cacheKey]) {
					break;
				}
			}
			const parsed = parseMangaList(html);
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
		if (mangaDataCache[url]) {
			finish(mangaDataCache[url]);
			return;
		}
		const html = await requestText(url);
		const chapterList = parseChapterList(html);
		if (!chapterList.length) {
			throw new Error('无法解析章节目录。');
		}
		const result = {
			title: parseTitle(html),
			description: parseDescription(html),
			chapterList
		};
		const cover = parseCover(html);
		if (cover) {
			result.coverUrl = cover;
		}
		mangaDataCache[url] = result;
		finish(result);
	} catch (error) {
		fail(error);
	}
}

async function getChapterImageList(chapterUrl) {
	try {
		const url = normalizeUrl(chapterUrl);
		if (chapterImageCache[url]) {
			finish(chapterImageCache[url]);
			return;
		}
		const images = parseChapterImages(await requestText(url));
		if (!images.length) {
			throw new Error('无法解析章节图片。');
		}
		chapterImageCache[url] = images;
		finish(images);
	} catch (error) {
		fail(error);
	}
}

async function getImageUrl(path) {
	finish(path);
}
