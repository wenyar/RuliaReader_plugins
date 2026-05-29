# nHentai Rulia 插件

在 Rulia 里阅读 nhentai.net 的作品，使用官方域名和 API，不使用镜像站。

数据来源：https://nhentai.net/

插件图片：`icon.png` 为随插件维护的 nHentai 横向展示图，`package.json` 中 `icon` 与 `cover` 均指向该文件。

## 接口与逻辑说明

- 列表 API：无关键词、无筛选且按最新排序时请求 `https://nhentai.net/api/v2/galleries?page={page}`。
- 搜索 API：关键词或筛选请求 `https://nhentai.net/api/v2/search?query={query}&sort={sort}&page={page}`。
- 筛选项：`language` 会拼接为 `language:"{value}"`；`tag` 会拼接为 `tag:"{value}"`；`sort` 支持最新、今日流行、本周流行、总人气。
- 详情 API：详情页 URL 中提取 `/g/{id}/`，再请求 `https://nhentai.net/api/v2/galleries/{id}`。
- 章节图片：nHentai 单个 gallery 在 Rulia 中作为一章“全篇”，图片来自详情 API 中的 `media_id` 与 `images.pages`。
- 图片地址：图片域使用 `https://i.nhentai.net/galleries/{media_id}/{page}.{ext}`；缩略图使用 `https://t.nhentai.net/`；`getImageUrl` 直接返回最终地址。
- 核心逻辑：内置请求队列和最小请求间隔，遇到 429 或限流会按退避延迟重试；列表和详情结果会缓存，限流时尽量使用缓存兜底。
- Payload：章节 URL 使用源站 gallery URL `https://nhentai.net/g/{id}/`，不额外封装自定义 payload。
- 已知限制：成人内容源；部分网络环境可能需要代理；官方 API 可能限流；标签列表较长，源站标签变动后需要同步维护。

## 验证样例

- 搜索关键词：待补充。
- 详情页样例：待补充。
- 章节样例：`https://nhentai.net/g/{id}/`，待补充具体 URL。

## 更新记录

- 0.0.1：按插件规范补全文档，保持版本号为初始版本。
