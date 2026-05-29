# 爱奇艺叭嗒 Rulia 插件

在 Rulia 里阅读 iqiyi.com/manhua 的漫画。

数据来源：https://www.iqiyi.com/manhua

插件图片：`icon.png` 为随插件维护的爱奇艺叭嗒横向展示图，`package.json` 中 `icon` 与 `cover` 均指向该文件。

## 接口与逻辑说明

- 分类页：分类浏览请求 `https://www.iqiyi.com/manhua/category/{category}_{status}_{pay}_{sort}_{page}/`。
- 搜索页：关键词搜索请求 `https://www.iqiyi.com/manhua/search-keyword={keyword}`，搜索结果在插件内按 `page` 与 `pageSize` 切片。
- 筛选项：`category` 为题材，`status` 为连载/完结，`pay` 为免费/付费，`sort` 为人气最高、最近更新、最新上线。
- 分页换算：分类页按源站约 24 条一页处理，插件会按 Rulia 的 `pageSize` 请求多个源站页并合并去重。
- 详情页：请求 `/manhua/detail_{comicId}.html`，解析标题、简介和封面；优先通过目录接口读取完整章节。
- 章节目录：目录接口为 `https://www.iqiyi.com/manhua/catalog/{comicId}/`，读取 `data.episodes` 后生成 reader URL；失败时回退解析详情 HTML 中的章节链接。
- 章节图片：请求 `https://www.iqiyi.com/manhua/reader/{comicId}_{episodeId}.html`，解析 `main-item` 图片节点的 `data-original` 或 `src`。
- 图片地址：图片地址统一转 HTTPS；`getImageUrl` 直接返回最终地址。
- 核心逻辑：详情和章节图片做内存缓存；网络请求设置 15 秒超时，避免源站无响应时页面长时间卡住；遇到 `authPass: "0"` 时返回需要授权或购买的中文错误；图片宽高优先读样式和 data 属性，缺省 `800 x 1200`。
- Payload：章节 URL 使用爱奇艺叭嗒 reader URL，不额外封装自定义 payload。
- 已知限制：付费、版权、地区限制章节会按源站权限结果处理；目录接口或页面结构变更会影响章节列表和图片解析。

## 验证样例

- 搜索关键词：待补充。
- 详情页样例：待补充。
- 章节样例：`https://www.iqiyi.com/manhua/reader/{comicId}_{episodeId}.html`，待补充具体 URL。

## 更新记录

- 0.0.1：按插件规范补全文档；实现分类、搜索、详情、目录接口、章节图片解析、权限提示和请求超时。
