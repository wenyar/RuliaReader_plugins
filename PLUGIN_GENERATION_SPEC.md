# RuliaReader 插件生成规范

本文档用于约束后续在本仓库生成 RuliaReader 插件的目录、文件、接口、数据结构、打包和验收要求。新的插件统一生成在仓库根目录下，目录名使用 `plugin.PluginName`。

## 1. 生成位置

- 仓库根目录：`RuliaReader_plugins`
- 插件目录：`plugin.PluginName`
- 插件压缩包：`plugin.PluginName.zip`
- 每个插件只维护自己的目录和同名 zip，不改动其他插件文件。

示例：

```text
plugin.Baozi/
plugin.Baozi.zip
plugin.Vomic/
plugin.Vomic.zip
```

## 2. 必备文件

每个插件目录至少包含：

```text
plugin.PluginName/
  package.json
  index.js
  README.md
  icon.png
```

可选文件：

```text
icon.svg
```

要求：

- `package.json`、`index.js`、`README.md` 必须使用 UTF-8。
- `README.md` 必须同时记录插件简介、数据来源、调用接口、页面解析逻辑、关键 payload 和已知限制，方便之后维护参考。
- `icon.png` 必须真实存在，并在 `package.json` 的 `icon` 字段中引用。
- RuliaReader 当前实际展示的是插件图片 `icon.png`，不单独使用封面图；`cover` 字段保留兼容时应与 `icon` 一样指向 `icon.png`。
- 不生成 `node_modules`、构建缓存、临时文件或无关截图。

## 2.1 插件图片规范

每个插件都必须提供符合站点特征的视觉资源：

- `icon.png` 不是传统小方形 favicon，而是 RuliaReader 插件列表使用的横向插件图片。
- `icon.png` 默认按 `300 x 180` 设计；宿主展示高度约 `180px` 写死，宽度可随页面布局变化，当前推荐宽度为 `300px`。
- 插件图片统一使用白底横向品牌图：左侧放源站图标或站点标识，右侧放网站名称，文字颜色应取自图标主色或相近品牌色，整体参考“拷贝漫画”这类左图标、右站名的插件图片。
- 如果源站有可用图标，必须优先使用源站图标，不要自行重绘成含义不同的替代图标。
- 如果源站没有合适图标，或图标质量过低，插件图片可以只使用网站名称文字，文字颜色使用对应网站主色或相近品牌色。
- 插件图片不要给图标或文字添加阴影、发光、浮雕等装饰效果，保持白底、清爽、扁平。
- 插件图片本身不要做“信息卡”式排版：不要写接口说明、插件说明、`RuliaReader Source`、域名脚注、标签胶囊、装饰性说明文字等，也不要使用复杂背景、装饰图案或额外标签。
- RuliaReader 卡片底部会覆盖黑色标题条，因此 `icon.png` 底部约 `34px` 区域不应放置重要文字或关键图形。
- 插件图片必须清晰、可辨识，不使用无关图片，不混用其他站点品牌。
- `package.json` 中 `icon` 必须指向 `icon.png`；`cover` 如保留，也应指向 `icon.png`，不要另做或引用 `cover.png`。
- 插件图片来自源站时，在 README 中简单标注来源；生成图片时标注为按站点视觉生成。

## 3. package.json 规范

`package.json` 必须是合法 JSON，字段建议如下：

```json
{
  "name": "@rulia/PluginName",
  "title": "插件显示名",
  "description": "在 Rulia 里阅读 example.com 的漫画。",
  "version": "0.0.1",
  "author": "Codex",
  "icon": "icon.png",
  "cover": "icon.png",
  "tags": ["站点名", "PluginName", "example", "manga", "comic"],
  "homepage": "https://example.com/"
}
```

字段要求：

- `name` 使用 `@rulia/PluginName`，PluginName 与目录名后缀一致。
- `title` 使用用户在 Rulia 中看到的中文或站点名称。
- `description` 简洁说明数据来源和用途。
- `version` 使用语义化版本；新插件从 `0.0.1` 开始，修复后递增 patch。
- `author` 默认写 `Codex`。
- `tags` 至少包含站点名、英文名或域名关键词、`manga`、`comic`。
- `homepage` 写源站主页，不写镜像站，除非用户明确要求。

## 4. index.js 接口规范

插件运行环境通过 `window.Rulia` 暴露能力。为兼容不同宿主写法，推荐封装：

```js
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
```

必须实现的异步函数：

```js
async function getMangaList(page, pageSize, keyword, rawFilterOptions) {}
async function getMangaData(dataPageUrl) {}
async function getChapterImageList(chapterUrl) {}
async function getImageUrl(path) {}
```

如果支持列表筛选，额外实现：

```js
async function setMangaListFilterOptions() {}
```

接口返回必须通过：

- 成功：`window.Rulia.endWithResult(value)` 或 `finish(value)`
- 失败：`window.Rulia.endWithException(message)` 或 `fail(error)`

不要直接 `return` 结果给宿主。

## 5. 列表接口返回结构

`getMangaList` 返回：

```js
{
  list: [
    {
      title: '作品名',
      url: 'https://example.com/comic/123',
      coverUrl: 'https://example.com/cover.jpg',
      latestChapter: '第 10 话',
      author: '作者名',
      description: '简介'
    }
  ]
}
```

要求：

- `title`、`url` 是核心字段，必须尽量保证有效。
- `coverUrl` 必须是绝对地址；无法解析时可使用站点默认图标或空字符串。
- 支持 `keyword` 搜索时，优先走源站搜索接口或搜索页。
- 支持 `rawFilterOptions` 时，需要安全解析 JSON；解析失败时按空筛选处理。
- 若源站分页大小与 `pageSize` 不一致，应在插件内换算分页，返回接近期望数量的数据。

## 6. 筛选接口返回结构

`setMangaListFilterOptions` 返回数组：

```js
[
  {
    label: '分类',
    name: 'category',
    options: [
      { label: '全部', value: '' },
      { label: '热血', value: 'hot' }
    ]
  },
  {
    label: '排序',
    name: 'sort',
    options: [
      { label: '最新', value: 'new' },
      { label: '热门', value: 'popular' }
    ]
  }
]
```

要求：

- `label` 是界面显示名。
- `name` 是传回 `rawFilterOptions` 的字段名。
- `options` 必须包含可用的 `{ label, value }`。
- 默认选项一般为 `全部`，`value` 用空字符串。

## 7. 详情接口返回结构

`getMangaData(dataPageUrl)` 返回：

```js
{
  title: '作品名',
  description: '作品简介',
  coverUrl: 'https://example.com/cover.jpg',
  chapterList: [
    {
      title: '第 1 话',
      url: 'https://example.com/chapter/1'
    }
  ]
}
```

要求：

- `dataPageUrl` 必须校验并规范化为合法 HTTP/HTTPS URL。
- `chapterList` 必须按 Rulia 预期阅读顺序返回；如源站倒序，需要在插件内调整。
- 章节 `url` 可以是源站 URL，也可以是插件自定义 payload 字符串，但必须能被 `getChapterImageList` 解析。
- 详情页数据可做内存缓存，避免重复请求。

## 8. 章节图片接口返回结构

`getChapterImageList(chapterUrl)` 返回图片数组：

```js
[
  {
    url: 'https://example.com/image-001.jpg',
    width: 800,
    height: 1200
  }
]
```

要求：

- 图片 `url` 必须是可访问的绝对地址。
- `width`、`height` 无法精确获取时，使用稳定默认值，例如 `800 x 1200`。
- 如源站图片需要 referer、防盗链或解密，必须在 `httpRequest`、URL 解析或 `getImageUrl` 中处理。
- 章节图片列表建议做内存缓存。
- 解析失败时抛出明确中文错误，例如 `无法解析章节图片。`

## 9. 图片 URL 接口

最简单实现：

```js
async function getImageUrl(path) {
  finish(path);
}
```

如果图片需要转换、签名、解密、补 header 或更换备用域名，应在此处或章节图片解析阶段完成。

## 10. 网络请求规范

统一使用 `window.Rulia.httpRequest`：

```js
async function requestText(url, referer) {
  return await rulia().httpRequest({
    url,
    method: 'GET',
    headers: {
      Referer: referer || BASE_URL + '/',
      Origin: BASE_URL,
      'User-Agent': 'Mozilla/5.0'
    },
    timeout: 20000
  });
}
```

要求：

- 所有请求 URL 必须先规范化和校验。
- 优先使用源站官方 API；没有 API 时再解析 HTML。
- HTML 解析要处理实体转义、相对路径、懒加载字段、脚本内图片地址等情况。
- 请求失败、限流或接口变化时，错误信息要可读。
- 不硬编码用户账号、密码、token、cookie。
- 登录态站点只提示用户在 Rulia 内保存 cookie，插件本身不保存敏感信息。

## 11. 安全与内容边界

- 不内置账号、密码、私有 cookie、token。
- 不写入本地文件，不修改宿主环境。
- 不引入远程执行逻辑。
- 不使用无关跟踪、统计或广告请求。
- 不绕过用户明确不希望访问的域名。
- 成人内容插件的 `title`、`description`、`tags` 要真实标识来源，避免伪装成普通漫画源。

## 12. README 规范

每个插件的 `README.md` 至少包含：

```md
# 插件显示名 Rulia 插件

在 Rulia 里阅读 example.com 的漫画。

数据来源：https://example.com/

## 接口与逻辑说明

- 列表页或列表 API：说明 URL 格式、分页参数、分类参数、排序参数。
- 搜索页或搜索 API：说明 keyword、page、pageSize 如何传入。
- 详情页：说明如何解析标题、简介、封面、章节列表。
- 章节图片：说明如何从章节 URL 或 payload 取得图片列表。
- 图片地址：说明是否需要 referer、签名、解密、备用域名。
- 核心逻辑：说明分页换算、缓存、章节排序、字段兜底等实现。
- Payload：记录自定义章节 URL 或 JSON payload 的字段含义。
- 已知限制：说明登录态、限流、地区访问限制、暂未支持的筛选项等。

## 验证样例

- 搜索关键词：记录 1-2 个实际测试过且能返回结果的关键词。
- 详情页样例：记录 1 个实际测试过的作品详情页 URL。
- 章节样例：记录 1 个实际测试过的章节 URL 或 payload 特征。

## 更新记录

- 0.0.1：初始版本。
```

如果有特殊要求，必须补充：

- 是否需要登录 cookie。
- 是否使用官方 API。
- 当前已知限制，例如搜索限制、限流、章节图片需要 referer。

要求：

- 写清真实调用过或解析过的 URL 模式，不只写“调用接口”。
- 对关键正则、HTML 字段、JSON 字段做简短说明。
- 如果实现里有缓存、分页换算、备用接口、图片域名替换，也必须记录。
- 如果站点需要登录 cookie，明确说明 cookie 由 Rulia 保存，插件不内置敏感信息。
- 验证样例必须来自实际测试结果，不凭空编写；如果当前无法联网验证，可写 `待补充` 并在汇报中说明。
- 更新记录只写对使用和维护有帮助的变化，不记录无意义的格式调整。
- 每次插件逻辑有明显变化时，同步更新 `README.md`。

## 13. 打包规范

生成或更新插件后，在仓库根目录创建同名 zip：

```text
plugin.PluginName.zip
```

zip 内部第一层应直接包含插件文件，推荐结构：

```text
package.json
index.js
README.md
icon.png
```

不要把 `plugin.PluginName/` 作为 zip 内部的顶层目录，除非 Rulia 的安装器明确要求。

## 14. 验收清单

新插件或更新插件完成前，至少检查：

- `package.json` 是合法 JSON。
- `name`、`title`、`version`、`icon`、`cover`、`homepage` 正确。
- `icon.png` 已按 `300 x 180` 横向插件图片规范制作，并按源站视觉生成或取材。
- `cover` 若存在，应与 `icon` 一样指向 `icon.png`。
- 已确认在 RuliaReader 卡片底部标题条覆盖后，`icon.png` 的主体仍能正常显示。
- `index.js` 无明显语法错误。
- `setMangaListFilterOptions` 能返回筛选项，若插件支持筛选。
- `getMangaList` 能返回列表，并支持搜索或分类中的至少一种。
- `getMangaData` 能返回标题、封面、简介和章节列表。
- `getChapterImageList` 能返回非空图片数组。
- `getImageUrl` 能返回最终图片地址。
- README 写清数据来源、特殊依赖、调用接口、页面解析方式、payload、核心逻辑和已知限制。
- README 写有验证样例；无法验证时标注 `待补充`。
- README 更新记录已补充当前版本变化。
- 同名 zip 已重新生成。

## 15. 更新已有插件时的要求

- 只改目标插件目录和对应 zip。
- 保留已有命名、字段和兼容逻辑。
- 修复功能后递增 `version`。
- 若源站域名、接口或登录要求变化，README 同步更新。
- 若插件新增、删除、改名，或注意事项发生变化，仓库根目录 `README.md` 的插件总表也要同步更新。
- 仓库根目录 `README.md` 的插件总表必须维护 `状态` 列，例如 `可用`、`需要登录`、`可能需要代理`、`可能限流`、`待修复`、`受源站权限影响`。
- 不删除用户已有的其他插件或 zip。

## 16. 后续默认工作流

收到“生成某某插件”或“修某某插件”后，默认按以下流程执行：

1. 在本仓库根目录创建或更新 `plugin.PluginName`。
2. 编写或修正 `package.json`、`index.js`、`README.md`、插件图片资源。
3. 根据源站实现列表、详情、章节图片和图片 URL 接口。
4. 更新 `README.md`，记录接口调用和相关逻辑。
5. 做基础静态检查。
6. 生成或刷新 `plugin.PluginName.zip`。
7. 如果是新增插件，同步更新仓库根目录 `README.md` 的插件列表、状态和注意事项。
8. 汇报改动文件、版本号和已知限制。
