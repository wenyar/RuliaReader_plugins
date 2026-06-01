const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const BASE_DIR = __dirname;
const TIMEOUT = 20000;

function request(options) {
	const url = options.url;
	const headers = options.headers || {};
	const init = {
		method: options.method || 'GET',
		headers,
		redirect: 'follow'
	};
	if (options.body) {
		init.body = options.body;
	}
	return fetch(url, init).then(async response => {
		if (!response.ok) {
			throw new Error('HTTP ' + response.status + ' ' + url);
		}
		return await response.text();
	});
}

function head(url) {
	return fetch(url, { method: 'HEAD', redirect: 'follow' }).then(response => ({
		status: response.status,
		contentType: response.headers.get('content-type') || '',
		contentLength: response.headers.get('content-length') || ''
	}));
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
	assert.strictEqual(pkg.name, '@rulia/Manben');
	assert.strictEqual(pkg.title, '漫本');
	assert.strictEqual(pkg.version, '0.0.3');
	assert.strictEqual(pkg.icon, 'icon.png');
	assert.strictEqual(pkg.cover, 'icon.png');
	assert.strictEqual(pkg.homepage, 'https://www.manben.com/');
	assert.ok(fs.existsSync(path.join(BASE_DIR, 'icon.png')), 'icon.png missing');

	const code = fs.readFileSync(path.join(BASE_DIR, 'index.js'), 'utf8');
	new vm.Script(code);
	const context = {
		console,
		URL,
		URLSearchParams,
		Date,
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
	assert.ok(Array.isArray(filters) && filters.length >= 5, 'filters invalid');

	const list = await call(context, 'getMangaList', [1, 10, '', '']);
	assert.ok(list.list.length > 0, 'empty default list');
	assert.ok(list.list[0].title && list.list[0].url && list.list[0].coverUrl, 'list item incomplete');

	const coverHead = await head(list.list[0].coverUrl);
	assert.strictEqual(coverHead.status, 200);
	assert.ok(/^image\//i.test(coverHead.contentType), 'cover is not image: ' + coverHead.contentType);

	const filtered = await call(context, 'getMangaList', [1, 10, '', JSON.stringify({ tag: '31', sort: '4' })]);
	assert.ok(filtered.list.length > 0, 'empty filtered list');

	const search = await call(context, 'getMangaList', [1, 10, '妖神', '']);
	assert.ok(search.list.length > 0, 'empty search list');

	const detail = await call(context, 'getMangaData', [list.list[0].url]);
	assert.ok(detail.title && detail.coverUrl && detail.chapterList.length > 0, 'detail incomplete');

	const sampleDetail = await call(context, 'getMangaData', ['https://www.manben.com/mh-shanhainizhan1/']);
	assert.ok(sampleDetail.chapterList.length > 0, 'sample detail chapter list empty');
	assert.ok(/山海之间/.test(sampleDetail.description), 'sample description missing real summary');
	assert.ok(!/class=|第\d+回|排行榜|人气：/.test(sampleDetail.description), 'sample description contains page noise');

	const yaoshenDetail = await call(context, 'getMangaData', ['https://www.manben.com/mh-yaoshenji/']);
	assert.ok(/妖神一出/.test(yaoshenDetail.description), 'yaoshen description missing real summary');
	assert.ok(!/class=|第\d+回|排行榜|人气：/.test(yaoshenDetail.description), 'yaoshen description contains page noise');

	const chapter = sampleDetail.chapterList[0];
	const images = await call(context, 'getChapterImageList', [chapter.url]);
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
		searchFirst: search.list[0].title,
		sampleTitle: sampleDetail.title,
		sampleChapter: chapter.title,
		imageCount: images.length,
		finalImageType: finalHead.contentType
	}, null, 2));
}

main().catch(error => {
	console.error(error);
	process.exit(1);
});
