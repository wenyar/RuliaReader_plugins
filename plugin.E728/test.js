const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const BASE_DIR = __dirname;
const TIMEOUT = 30000;
const EMPTY_COVER = 'https://www.e728.com/template/pc/zizhi001/img/logo.png';

function request(options) {
	return fetch(options.url, {
		method: options.method || 'GET',
		headers: options.headers || {},
		redirect: 'follow'
	}).then(async response => {
		if (!response.ok) {
			throw new Error('HTTP ' + response.status + ' ' + options.url);
		}
		return await response.text();
	});
}

async function head(url) {
	const response = await fetch(url, {
		method: 'HEAD',
		redirect: 'follow'
	});
	return {
		status: response.status,
		contentType: response.headers.get('content-type') || ''
	};
}

function call(context, name, args) {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error(name + ' timeout')), TIMEOUT);
		context.window.Rulia.endWithResult = value => {
			clearTimeout(timer);
			resolve(value);
		};
		context.window.Rulia.endWithException = message => {
			clearTimeout(timer);
			reject(new Error(message));
		};
		Promise.resolve(context[name].apply(null, args)).catch(error => {
			clearTimeout(timer);
			reject(error);
		});
	});
}

async function main() {
	const pkg = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'package.json'), 'utf8'));
	assert.strictEqual(pkg.name, '@rulia/E728');
	assert.strictEqual(pkg.title, '漫画屋');
	assert.strictEqual(pkg.version, '0.1.16');
	assert.strictEqual(pkg.icon, 'icon.png');
	assert.strictEqual(pkg.cover, 'icon.png');
	assert.strictEqual(pkg.homepage, 'https://www.e728.com/');
	assert.ok(fs.existsSync(path.join(BASE_DIR, 'icon.png')), 'icon.png missing');

	const code = fs.readFileSync(path.join(BASE_DIR, 'index.js'), 'utf8');
	new vm.Script(code);
	const context = {
		console,
		URL,
		URLSearchParams,
		JSON,
		Math,
		parseInt,
		Number,
		String,
		Array,
		setTimeout,
		clearTimeout,
		window: {
			Rulia: {
				httpRequest: request,
				endWithResult() {},
				endWithException() {}
			}
		}
	};
	vm.createContext(context);
	vm.runInContext(code, context);

	const filters = await call(context, 'setMangaListFilterOptions', []);
	assert.ok(Array.isArray(filters) && filters.length === 3, 'filters invalid');
	assert.strictEqual(filters[0].name, 'category');
	assert.ok(filters[0].options.length > 250, 'category options should be complete');
	assert.ok(filters[0].options.some(option => option.label === '燃向' && option.value === '313'), 'missing category 燃向');
	assert.strictEqual(filters[1].name, 'status');
	assert.strictEqual(filters[2].name, 'order');

	const list = await call(context, 'getMangaList', [1, 12, '', '']);
	assert.ok(list.list.length > 0, 'empty default list');
	assert.ok(list.list[0].title && list.list[0].url, 'list item incomplete');

	for (let i = 0; i < list.list.length; i++) {
		if (list.list[i].coverUrl === EMPTY_COVER) {
			continue;
		}
		if (!list.list[i].coverUrl) {
			continue;
		}
		const currentHead = await head(list.list[i].coverUrl);
		assert.strictEqual(currentHead.status, 200, 'cover HTTP failed: ' + list.list[i].title);
		assert.ok(/^image\//i.test(currentHead.contentType), 'cover is not image: ' + list.list[i].title + ' ' + currentHead.contentType);
	}
	const jueshiListItem = list.list.find(item => item.title === '绝世武神');
	assert.ok(jueshiListItem, 'missing 绝世武神 in default list');
	assert.strictEqual(jueshiListItem.coverUrl, EMPTY_COVER, 'known bad cover should use site logo placeholder in list');

	const listPage2 = await call(context, 'getMangaList', [2, 12, '', '']);
	assert.ok(listPage2.list.length > 0, 'default page 2 should not be empty');
	assert.deepStrictEqual(Object.keys(listPage2).sort(), ['list'], 'default list should only return list');
	assert.ok(!list.list.some(item => listPage2.list.some(next => next.url === item.url)), 'page 1 and 2 should not overlap');

	const largePage1 = await call(context, 'getMangaList', [1, 50, '', '']);
	const largePage2 = await call(context, 'getMangaList', [2, 50, '', '']);
	assert.ok(largePage1.list.length > 0 && largePage2.list.length > 0, 'large page lists should not be empty');
	assert.ok(largePage1.list.length > 20, 'large page should merge multiple source pages');
	assert.ok(!largePage1.list.some(item => largePage2.list.some(next => next.url === item.url)), 'large page 1 and 2 should not overlap');
	assert.deepStrictEqual(Object.keys(largePage1).sort(), ['list'], 'large default list should only return list');

	const lastPage = await call(context, 'getMangaList', [795, 20, '', '']);
	const afterLastPage = await call(context, 'getMangaList', [796, 20, '', '']);
	assert.ok(lastPage.list.length > 0, 'last category page should not be empty');
	assert.strictEqual(afterLastPage.list.length, 0, 'after last category page should be empty');

	const filtered = await call(context, 'getMangaList', [1, 12, '', JSON.stringify({ category: '6' })]);
	assert.ok(filtered.list.length > 0, 'empty filtered list');

	const combinedFiltered = await call(context, 'getMangaList', [1, 12, '', JSON.stringify({ category: '6', status: '1', order: 'addtime' })]);
	assert.ok(combinedFiltered.list.length > 0, 'empty combined filtered list');

	const search = await call(context, 'getMangaList', [1, 12, '斗破', '']);
	assert.ok(search.list.length > 0, 'empty search list');
	assert.ok(search.list.some(item => /斗破/.test(item.title)), 'search result missing keyword');
	assert.deepStrictEqual(Object.keys(search).sort(), ['list'], 'search should only return list');
	const searchPage2 = await call(context, 'getMangaList', [2, 12, '斗破', '']);
	assert.strictEqual(searchPage2.list.length, 0, 'search page 2 should be empty because source ignores pagination');

	const detail = await call(context, 'getMangaData', [list.list[0].url]);
	assert.ok(detail.title && detail.coverUrl && detail.chapterList.length > 0, 'detail incomplete');

	const sampleDetail = await call(context, 'getMangaData', ['https://www.e728.com/comic_10627.html']);
	assert.ok(sampleDetail.title === '妹子与科学', 'sample title mismatch');
	assert.ok(sampleDetail.chapterList.length > 0, 'sample chapters empty');

	const jueshiDetail = await call(context, 'getMangaData', ['https://www.e728.com/comic_13767.html']);
	assert.strictEqual(jueshiDetail.title, '绝世武神');
	assert.strictEqual(jueshiDetail.coverUrl, EMPTY_COVER, 'known bad cover should use site logo placeholder in detail');
	assert.ok(jueshiDetail.chapterList.length > 0, 'jueshi chapters empty');

	const sampleChapter = sampleDetail.chapterList[0];
	const images = await call(context, 'getChapterImageList', [sampleChapter.url]);
	assert.ok(images.length > 0, 'chapter images empty');

	const imageHead = await head(images[0].url);
	assert.strictEqual(imageHead.status, 200);
	assert.ok(/^image\//i.test(imageHead.contentType), 'chapter image is not image: ' + imageHead.contentType);

	const finalUrl = await call(context, 'getImageUrl', [images[0].url]);
	assert.strictEqual(finalUrl, images[0].url);
	const finalHead = await head(finalUrl);
	assert.strictEqual(finalHead.status, 200);
	assert.ok(/^image\//i.test(finalHead.contentType), 'final image is not direct image: ' + finalHead.contentType);

	console.log(JSON.stringify({
		defaultFirst: list.list[0].title,
		filteredFirst: filtered.list[0].title,
		searchCount: search.list.length,
		sampleTitle: sampleDetail.title,
		sampleChapter: sampleChapter.title,
		imageCount: images.length,
		finalImageType: finalHead.contentType
	}, null, 2));
}

main().catch(error => {
	console.error(error);
	process.exit(1);
});
