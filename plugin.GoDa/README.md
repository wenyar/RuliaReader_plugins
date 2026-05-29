# GoDa漫画 Rulia 插件

在 Rulia 里阅读 godamh.com 的漫画。

数据来源：https://godamh.com/

插件图片：`icon.png` 为随插件维护的 GoDa 横向展示图，`package.json` 中 `icon` 与 `cover` 均指向该文件。

## 接口与逻辑说明

- 列表页：分类和排序组合为 `https://godamh.com/{path}/page/{page}`，例如 `manga/page/1`、`hots/page/1`、`manga-genre/cn/page/1`、`manga-tag/lianai/page/1`。
- 搜索页：关键词搜索使用 `https://godamh.com/s/{keyword}?page={page}`。
- 筛选项：`category` 支持国漫、韩漫、日漫及常用标签；`sort` 支持全部漫画、人气推荐、热门更新、最新上架。
- 分页换算：源站单页按 24 条处理，插件会根据 Rulia 的 `pageSize` 请求一个或多个源站页并去重。
- 详情页：请求作品详情页，解析标题、简介、封面和 `data-mid`；优先调用 `https://api-get-v3.mgsearcher.com/api/manga/get?mid={mid}&mode=all` 读取全量章节。
- 章节图片：章节 payload 中包含 `mid` 与 `cid`，图片列表来自 `https://api-get-v3.mgsearcher.com/api/chapter/getinfo?m={mid}&c={cid}`。
- 图片地址：接口返回的相对路径会补全到 `g-mh.online`，并在 `f40-1-4` 与 `t40-1-4` 间尝试备用域名。
- 核心逻辑：详情和章节图片做内存缓存；网络请求设置 15 秒超时，避免源站或章节接口无响应时页面长时间卡住；API 章节目录失败时回退解析详情页最近章节；图片宽高默认 `800 x 1200`。
- Payload：章节 URL 形如 `goda://mu={mangaUrl}&cu={chapterPageUrl}&m={mid}&c={cid}&s={slug}`，用于保存作品页、章节页、漫画 ID、章节 ID 和 slug。
- 已知限制：GoDa 和包子漫画使用相近 API 与图片域，源站接口、图片域名或 API 鉴权变化时需要更新插件。

## 验证样例

- 搜索关键词：待补充。
- 详情页样例：待补充。
- 章节样例：`goda://` payload，待联网验证后补充具体作品。

## 更新记录

- 0.0.1：按插件规范补全文档；实现列表、搜索、详情、章节目录、章节图片、请求超时和章节目录兜底解析。
