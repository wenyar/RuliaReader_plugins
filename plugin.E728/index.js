const BASE_URL = 'https://www.e728.com';
const SITE_PAGE_SIZE = 20;
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 1200;
const REQUEST_TIMEOUT = 20000;
const REQUEST_RETRIES = 2;
const EMPTY_COVER = BASE_URL + '/template/pc/zizhi001/img/logo.png';

const mangaDataCache = {};
const chapterImageCache = {};
const listMaxPageCache = {};
let listPageBase = null;

const BAD_COVER_PATHS = {
	'/comic/cover/jueshiwushen.webp': true,
	'/comic/cover/renya%e2%85%a1.webp': true,
	'/comic/cover/renyaⅱ.webp': true
};

const CATEGORIES = [
	{ label: '全部', value: '' },
	{ label: '热血', value: '6' }, { label: '冒险', value: '7' }, { label: '科幻', value: '8' }, { label: '霸总', value: '9' },
	{ label: '玄幻', value: '10' }, { label: '校园', value: '11' }, { label: '修真', value: '12' }, { label: '搞笑', value: '13' },
	{ label: '穿越', value: '14' }, { label: '后宫', value: '15' }, { label: '耽美', value: '16' }, { label: '恋爱', value: '17' },
	{ label: '悬疑', value: '18' }, { label: '恐怖', value: '19' }, { label: '战争', value: '20' }, { label: '动作', value: '21' },
	{ label: '同人', value: '22' }, { label: '竞技', value: '23' }, { label: '励志', value: '24' }, { label: '架空', value: '25' },
	{ label: '灵异', value: '26' }, { label: '百合', value: '27' }, { label: '古风', value: '28' }, { label: '生活', value: '29' },
	{ label: '真人', value: '30' }, { label: '都市', value: '31' }, { label: '神鬼', value: '48' }, { label: '幽默爆笑', value: '49' },
	{ label: '推理', value: '50' }, { label: '青春', value: '51' }, { label: '爆笑', value: '52' }, { label: '纯爱', value: '53' },
	{ label: '日常', value: '54' }, { label: '剧情', value: '55' }, { label: '逆袭', value: '56' }, { label: '少年', value: '57' },
	{ label: '奇幻冒险', value: '58' }, { label: '美食', value: '59' }, { label: '奇幻', value: '60' }, { label: '唯美', value: '61' },
	{ label: '治愈', value: '62' }, { label: '爱情', value: '63' }, { label: 'TL', value: '64' }, { label: '搞笑喜剧', value: '65' },
	{ label: '合集', value: '66' }, { label: '短篇', value: '67' }, { label: '后宫·宮廷', value: '68' }, { label: '格斗', value: '69' },
	{ label: '魔幻', value: '70' }, { label: '恐怖·惊悚', value: '71' }, { label: '西幻', value: '72' }, { label: '推理悬疑', value: '73' },
	{ label: '韩漫', value: '74' }, { label: '脑洞', value: '75' }, { label: '暗黑', value: '76' }, { label: '欢乐向', value: '77' },
	{ label: '长条', value: '78' }, { label: '武侠', value: '79' }, { label: '大女主', value: '80' }, { label: '异形', value: '81' },
	{ label: '职场', value: '82' }, { label: '总裁', value: '83' }, { label: '异能', value: '84' }, { label: '亲情', value: '85' },
	{ label: '现代', value: '86' }, { label: '异世界', value: '87' }, { label: '复仇', value: '88' }, { label: '西方', value: '89' },
	{ label: '言情', value: '90' }, { label: '其他', value: '91' }, { label: '欧式宫廷', value: '92' }, { label: '养成', value: '93' },
	{ label: '重生', value: '94' }, { label: '奇幻爱情', value: '95' }, { label: '少女', value: '96' }, { label: '萌系', value: '97' },
	{ label: '悬疑灵异', value: '98' }, { label: '青年', value: '99' }, { label: '连载', value: '100' }, { label: '游戏', value: '101' },
	{ label: '少男', value: '102' }, { label: '飒漫画', value: '103' }, { label: '历史', value: '104' }, { label: '日漫', value: '105' },
	{ label: '浪漫', value: '106' }, { label: '撒糖', value: '107' }, { label: '浪漫爱情', value: '108' }, { label: '战斗', value: '109' },
	{ label: '宫廷', value: '110' }, { label: '现言', value: '111' }, { label: '惊悚', value: '112' }, { label: '完结', value: '113' },
	{ label: '系统', value: '114' }, { label: '甜宠', value: '115' }, { label: '体育', value: '116' }, { label: '古装', value: '117' },
	{ label: '综合', value: '118' }, { label: '权谋', value: '119' }, { label: '神仙', value: '120' }, { label: '虐心', value: '121' },
	{ label: '正能量', value: '122' }, { label: '投稿', value: '123' }, { label: '怪物', value: '124' }, { label: '高甜', value: '125' },
	{ label: '畅销', value: '126' }, { label: '烧脑', value: '127' }, { label: '机甲', value: '128' }, { label: '末日', value: '129' },
	{ label: '电竞', value: '130' }, { label: '诡异', value: '131' }, { label: '性转', value: '132' }, { label: '金手指', value: '133' },
	{ label: '修仙', value: '134' }, { label: '科幻魔幻', value: '135' }, { label: '黑白漫', value: '136' }, { label: 'ABO', value: '137' },
	{ label: '非人类', value: '138' }, { label: '橘里橘气', value: '139' }, { label: '多女主', value: '140' }, { label: '单女主', value: '141' },
	{ label: '家庭', value: '142' }, { label: '搞笑/生活', value: '143' }, { label: '生存', value: '144' }, { label: '少年热血', value: '145' },
	{ label: '惊悚/恐怖', value: '146' }, { label: '玄幻科幻', value: '147' }, { label: '台湾原创作品', value: '148' }, { label: '疗癒/萌系', value: '149' },
	{ label: 'LGBTQ+', value: '150' }, { label: '性转换', value: '151' }, { label: '美食家', value: '152' }, { label: '影视化', value: '153' },
	{ label: '穿越/转生', value: '154' }, { label: '古代宫廷', value: '155' }, { label: '现代/职场', value: '156' }, { label: '武侠仙侠', value: '157' },
	{ label: '冒险热血', value: '158' }, { label: '悬疑推理', value: '159' }, { label: '游戏竞技', value: '160' }, { label: '大人系', value: '161' },
	{ label: '妖怪', value: '162' }, { label: '偶像', value: '163' }, { label: '宫斗', value: '164' }, { label: '探案', value: '165' },
	{ label: '逆转', value: '166' }, { label: '情感', value: '167' }, { label: '运动', value: '168' }, { label: '漫客栈', value: '169' },
	{ label: '女神', value: '170' }, { label: '资讯', value: '171' }, { label: '少女爱情', value: '172' }, { label: '强强', value: '173' },
	{ label: '知音漫客', value: '174' }, { label: '都市日常', value: '175' }, { label: '神魔', value: '176' }, { label: '古怪', value: '177' },
	{ label: '魔法', value: '178' }, { label: '东方神鬼', value: '179' }, { label: '社会', value: '180' }, { label: '萌娃', value: '181' },
	{ label: '宠兽', value: '182' }, { label: '丧尸', value: '183' }, { label: '江湖', value: '184' }, { label: '架空世界', value: '185' },
	{ label: '克苏鲁', value: '186' }, { label: '恶搞', value: '187' }, { label: '反套路', value: '188' }, { label: '原创', value: '189' },
	{ label: '娱乐圈', value: '190' }, { label: '经营', value: '191' }, { label: '仙侠', value: '192' }, { label: '神豪', value: '193' },
	{ label: '萝莉', value: '194' }, { label: '彩虹', value: '195' }, { label: '绅士', value: '196' }, { label: '都市脑洞', value: '197' },
	{ label: '武侠格斗', value: '198' }, { label: '节操', value: '199' }, { label: '转生', value: '200' }, { label: '女频', value: '201' },
	{ label: '马甲', value: '202' }, { label: '豪快', value: '203' }, { label: '暖萌', value: '204' }, { label: '兄弟情', value: '205' },
	{ label: '动作冒险', value: '206' }, { label: '恐怖灵异', value: '207' }, { label: '欧风', value: '208' }, { label: 'BL/GL', value: '209' },
	{ label: '悬疑恐怖', value: '210' }, { label: '治愈/萌系', value: '211' }, { label: '医术', value: '212' }, { label: '女生', value: '213' },
	{ label: '改编', value: '214' }, { label: '幻想', value: '215' }, { label: '橘味', value: '216' }, { label: '惊险', value: '217' },
	{ label: '惊奇', value: '218' }, { label: '劇情', value: '219' }, { label: '现代言情', value: '220' }, { label: '逗比', value: '221' },
	{ label: '黑暗', value: '222' }, { label: '悬疑脑洞', value: '223' }, { label: '生活漫画', value: '224' }, { label: '运动竞技', value: '225' },
	{ label: '少儿', value: '226' }, { label: '耽美爱情', value: '227' }, { label: '宅向', value: '228' }, { label: '真人漫', value: '229' },
	{ label: '权斗', value: '230' }, { label: '限制级', value: '231' }, { label: '日本', value: '232' }, { label: '经典', value: '233' },
	{ label: '神话', value: '234' }, { label: '神界漫画', value: '235' }, { label: '古風', value: '236' }, { label: '穿书', value: '237' },
	{ label: '机战', value: '238' }, { label: '宅斗', value: '239' }, { label: '其它', value: '240' }, { label: '奇幻仙侠', value: '241' },
	{ label: '橘系', value: '242' }, { label: '侦探推理', value: '243' }, { label: '致郁', value: '244' }, { label: '无节操', value: '245' },
	{ label: '古代言情', value: '246' }, { label: '戀愛', value: '247' }, { label: '装逼', value: '248' }, { label: '男生', value: '249' },
	{ label: '末世', value: '250' }, { label: '漫改', value: '251' }, { label: '智斗', value: '252' }, { label: '迪化', value: '253' },
	{ label: '猎奇', value: '254' }, { label: '格鬥', value: '255' }, { label: '无敌流', value: '256' }, { label: '飒漫乐画', value: '257' },
	{ label: '现言脑洞', value: '258' }, { label: '种田', value: '259' }, { label: '豪门总裁', value: '260' }, { label: '玄幻脑洞', value: '261' },
	{ label: '橘调', value: '262' }, { label: '新作', value: '263' }, { label: '熱血', value: '264' }, { label: '氪金', value: '265' },
	{ label: '蔷薇', value: '266' }, { label: '冒險', value: '267' }, { label: '虐恋', value: '268' }, { label: '僵尸', value: '269' },
	{ label: '国漫', value: '270' }, { label: '断头岛', value: '271' }, { label: '商战', value: '272' }, { label: '现言萌宝', value: '273' },
	{ label: '天上空', value: '274' }, { label: '渡之鸟', value: '275' }, { label: '阿衰', value: '276' }, { label: '宫斗宅斗', value: '277' },
	{ label: '腹黑', value: '279' }, { label: '喜剧', value: '280' }, { label: '多世界', value: '281' }, { label: '婚宠', value: '282' },
	{ label: '开挂', value: '283' }, { label: '直播', value: '284' }, { label: '明星', value: '285' }, { label: '双男主', value: '286' },
	{ label: '幽默', value: '287' }, { label: '美型', value: '288' }, { label: '犯罪', value: '289' }, { label: '网游', value: '290' },
	{ label: '萌宝', value: '291' }, { label: '怀旧', value: '292' }, { label: '楚楚', value: '293' }, { label: '後宮', value: '294' },
	{ label: '幻想言情', value: '295' }, { label: '震撼', value: '296' }, { label: '玄幻言情', value: '297' }, { label: '神漫', value: '298' },
	{ label: '福利', value: '299' }, { label: '古风穿越', value: '300' }, { label: '小僵尸', value: '303' }, { label: '小说', value: '304' },
	{ label: '都市大女主', value: '305' }, { label: '美少女', value: '306' }, { label: '人性', value: '307' }, { label: '鬼怪', value: '308' },
	{ label: '都市异能', value: '309' }, { label: '歌舞', value: '310' }, { label: '魔王', value: '311' }, { label: '乙女', value: '312' },
	{ label: '燃向', value: '313' }
];

const STATUS_OPTIONS = [
	{ label: '全部', value: '' },
	{ label: '连载中', value: '1' },
	{ label: '已完结', value: '2' }
];

const ORDER_OPTIONS = [
	{ label: '热门人气', value: 'hits' },
	{ label: '最新更新', value: 'addtime' }
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
	return isBadCover(url) ? EMPTY_COVER : url;
}

function detailCoverUrl(value, base) {
	const url = cleanImageUrl(value, base);
	return isBadCover(url) ? EMPTY_COVER : url;
}

async function requestText(url, referer) {
	const requestUrl = normalizeUrl(url);
	let lastError = null;
	for (let i = 0; i < REQUEST_RETRIES; i++) {
		try {
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
		} catch (error) {
			lastError = error;
		}
	}
	throw lastError || new Error('请求失败：' + requestUrl);
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
	const sourcePageCount = Math.max(1, Math.ceil(requestedSize / SITE_PAGE_SIZE));
	const firstSourcePage = requestPageIndex(page) * sourcePageCount + 1;
	const pages = [];
	for (let i = 0; i < sourcePageCount; i++) {
		pages.push(firstSourcePage + i);
	}
	return pages;
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
	const category = filterOptions.category || '';
	const pathParts = ['/category'];
	if (filterOptions.order) {
		pathParts.push('order', encodeURIComponent(filterOptions.order));
	}
	if (filterOptions.status) {
		pathParts.push('finish', encodeURIComponent(filterOptions.status));
	}
	if (category) {
		pathParts.push('tags', encodeURIComponent(category));
	}
	return BASE_URL + pagePath(pathParts.join('/'), page);
}

function listCacheKey(filterOptions) {
	const category = filterOptions.category || '';
	return [
		'category',
		filterOptions.order || '',
		filterOptions.status || '',
		category
	].join(':');
}

function parseMaxPage(html) {
	let maxPage = 1;
	String(html || '').replace(/href=["'][^"']*\/category(?:\/[^"']*)?\/page\/(\d+)[^"']*["']/gi, (_, page) => {
		maxPage = Math.max(maxPage, parseInt(page, 10) || 1);
		return '';
	});
	return maxPage;
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
		const item = {
			title,
			url,
			latestChapter: stripTags((block.match(/<span\b[^>]*class=["'][^"']*\bupdate-badge\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) || [])[1]),
			author: stripTags((block.match(/<p\b[^>]*class=["'][^"']*\bcomic-author\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i) || [])[1]),
			description: stripTags((block.match(/<p\b[^>]*class=["'][^"']*\bcomic-desc\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i) || [])[1])
		};
		item.coverUrl = coverUrl(attr(img, 'data-src') || attr(img, 'src'));
		result.push(item);
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
	finish([
		{ label: '分类', name: 'category', options: CATEGORIES },
		{ label: '状态', name: 'status', options: STATUS_OPTIONS },
		{ label: '排序', name: 'order', options: ORDER_OPTIONS }
	]);
}

async function getMangaList(page, pageSize, keyword, rawFilterOptions) {
	try {
		const query = String(keyword || '').trim();
		if (query) {
			if (requestPageIndex(page) > 0) {
				finish({ list: [] });
				return;
			}
			finish(parseMangaList(await requestText(buildSearchUrl(query))));
			return;
		}
		const filterOptions = parseFilterOptions(rawFilterOptions);
		const cacheKey = listCacheKey(filterOptions);
		const pages = sitePagesForRequest(page, pageSize);
		const results = [];
		for (let i = 0; i < pages.length; i++) {
			if (listMaxPageCache[cacheKey] && pages[i] > listMaxPageCache[cacheKey]) {
				break;
			}
			let html;
			try {
				html = await requestText(buildListUrl(pages[i], filterOptions));
			} catch (error) {
				if (results.length) {
					break;
				}
				throw error;
			}
			const maxPage = parseMaxPage(html);
			listMaxPageCache[cacheKey] = Math.max(listMaxPageCache[cacheKey] || 1, maxPage);
			if (pages[i] > listMaxPageCache[cacheKey]) {
				break;
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
			coverUrl: EMPTY_COVER,
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
