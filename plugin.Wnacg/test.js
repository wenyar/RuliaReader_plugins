const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const https = require('https');

const pluginDir = __dirname;
const pkg = JSON.parse(fs.readFileSync(path.join(pluginDir, 'package.json'), 'utf8'));
assert.strictEqual(pkg.name, '@rulia/Wnacg');
assert.strictEqual(pkg.title, '紳士漫畫');
assert.strictEqual(pkg.version, '0.0.11');
assert.strictEqual(pkg.icon, 'icon.png');
assert.strictEqual(pkg.cover, 'icon.png');
assert.strictEqual(pkg.homepage, 'https://www.wnacg.com/');

const code = fs.readFileSync(path.join(pluginDir, 'index.js'), 'utf8');
new vm.Script(code);

let lastResult;
let lastError;

function requestText(url) {
	return new Promise((resolve, reject) => {
		const headers = {
			'User-Agent': 'Mozilla/5.0',
			Accept: 'text/html,application/xhtml+xml,application/json,text/plain,*/*'
		};
		if (process.env.WNACG_COOKIE) {
			headers.Cookie = process.env.WNACG_COOKIE;
		}
		https.get(url, { headers }, response => {
			let body = '';
			response.setEncoding('utf8');
			response.on('data', chunk => {
				body += chunk;
			});
			response.on('end', () => {
				if (response.statusCode >= 400) {
					reject(new Error('HTTP ' + response.statusCode + ': ' + body.slice(0, 200)));
					return;
				}
				resolve(body);
			});
		}).on('error', reject);
	});
}

const sandbox = {
	console,
	URL,
	URLSearchParams,
	window: {
		Rulia: {
			httpRequest: options => requestText(options.url),
			endWithResult: value => {
				lastResult = value;
				lastError = null;
			},
			endWithException: message => {
				lastResult = undefined;
				lastError = message;
			}
		}
	}
};

vm.createContext(sandbox);
vm.runInContext(code, sandbox);

(async () => {
	await sandbox.setMangaListFilterOptions();
	assert(Array.isArray(lastResult));
	assert.strictEqual(lastResult[0].name, 'period');
	assert.strictEqual(lastResult[0].options.length, 4);
	assert(lastResult[1].options.length >= 20);
	assert.strictEqual(lastResult.length, 2);

	if (!process.env.WNACG_COOKIE) {
		console.log('Static checks passed. Set WNACG_COOKIE to run live WNACG checks.');
		return;
	}

	await sandbox.getMangaList(1, 12, '', '');
	assert(!lastError, lastError);
	assert(lastResult.list.length > 0, 'list should not be empty');
	assert(lastResult.list[0].title && lastResult.list[0].url, 'first list item should have title and url');

	await sandbox.getMangaList(1, 12, '西园寺南歌', '');
	assert(!lastError, lastError);
	assert(lastResult.list.length > 0, 'search should not be empty');

	await sandbox.getMangaData(lastResult.list[0].url);
	assert(!lastError, lastError);
	assert(lastResult.title && lastResult.chapterList.length > 0, 'detail should have title and chapter');

	await sandbox.getChapterImageList(lastResult.chapterList[0].url);
	assert(!lastError, lastError);
	assert(lastResult.length > 0 && /^https?:\/\//.test(lastResult[0].url), 'chapter should have image urls');

	await sandbox.getImageUrl(lastResult[0].url);
	assert(/^https?:\/\//.test(lastResult), 'getImageUrl should return image url');
	console.log('Live WNACG checks passed.');
})().catch(error => {
	console.error(error);
	process.exit(1);
});
