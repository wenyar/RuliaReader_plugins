# 包子漫画 Rulia 插件

在 Rulia 里阅读 baozimh.org 的漫画。

数据来源：https://baozimh.org/

插件图片：`icon.png` 为随插件维护的包子漫画横向展示图，`package.json` 中 `icon` 与 `cover` 均指向该文件。

## 接口与逻辑说明

- 列表页：分类和排序组合为 `https://baozimh.org/{path}/page/{page}`，例如 `manga/page/1`、`hots/page/1`、`manga-genre/cn/page/1`、`manga-tag/lianai/page/1`。
- 搜索页：关键词搜索使用 `https://baozimh.org/s/{keyword}?page={page}`。
- 筛选项：`category` 支持国漫、韩漫、日漫及常用标签；`sort` 支持全部漫画、人气推荐、热门更新、最新上架。
- 分页换算：源站单页按 24 条处理，插件会根据 Rulia 传入的 `pageSize` 计算需要请求的源站页并合并去重。
- 详情页：请求漫画详情 HTML，解析标题、简介、封面和 `data-mid`；优先调用 `https://api-get-v3.mgsearcher.com/api/manga/get?mid={mid}&mode=all` 读取全量章节。
- 章节图片：章节 URL 使用自定义 payload，读取 `mid`、`cid` 后调用 `https://api-get-v3.mgsearcher.com/api/chapter/getinfo?m={mid}&c={cid}`。
- 图片地址：接口返回的图片路径会补全到 `g-mh.online` 图片域，并在 `f40-1-4` 与 `t40-1-4` 之间做备用域名替换；`getImageUrl` 直接返回最终地址。
- 核心逻辑：详情和章节图片做内存缓存；网络请求设置 15 秒超时，避免源站无响应时页面一直等待；章节 API 失败时会尝试从章节页 HTML 兜底解析图片；图片宽高无法从接口精确取得时使用 `800 x 1200`；HTML 图片代理地址会尝试解出真实 `url` 参数。
- Payload：章节 URL 形如 `mgchapter://mu={mangaUrl}&cu={chapterPageUrl}&m={mid}&c={cid}&s={slug}`，分别表示作品页、章节页、漫画 ID、章节 ID 和章节 slug。
- 已知限制：源站接口、图片域名或章节 API 变更会导致解析失败；部分网络环境可能需要代理；搜索和图片访问可能受源站限流影响。

## 验证样例

- 搜索关键词：待补充。
- 详情页样例：待补充。
- 章节样例：`mgchapter://` payload，待联网验证后补充具体作品。

## 更新记录

- 0.0.1：按插件规范补全文档；实现列表、搜索、详情、章节目录、章节图片、请求超时和章节图片兜底解析。
