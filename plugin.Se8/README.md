# Se8 Rulia 插件

在 Rulia 里阅读 se8.us 的漫画。

数据来源：https://se8.us/。

插件图片：`icon.png` 为随插件维护的 Se8 横向展示图，`package.json` 中 `icon` 与 `cover` 均指向该文件。

## 接口与逻辑说明

- 分类页：默认请求 `https://se8.us/index.php/category/`，筛选会追加如 `tags/61`、`finish/1`、`order/hits`、`pay/1` 等路径，分页追加 `/page/{page}`。
- 搜索页：关键词搜索请求 `https://se8.us/index.php/search?key={keyword}`，分页时追加 `page={page}`。
- 筛选项：`category`、`status`、`sort` 都映射到源站 category 路径；当前实现按 `sort`、`status`、`category` 的优先级选择一个路径。
- 分页换算：源站单页按 24 条处理，插件按 Rulia 的 `pageSize` 请求多个源站页并合并去重。
- 详情页：请求 `/index.php/comic/{id}`，解析标题、简介、封面和章节链接。
- 章节图片：请求 `/index.php/chapter/{id}`，解析 class 包含 `lazy-read` 的图片节点，使用 `data-original`、`data-src` 或 `src`。
- 图片地址：图片地址会跳过加载占位图和 data URI，转为绝对 URL；`getImageUrl` 直接返回最终地址。
- 核心逻辑：网络请求设置 15 秒超时；章节图片会用浏览器 `Image` 对象尝试读取宽高，并在 8 秒后返回 `1 x 1` 兜底，避免章节页一直转圈；列表合并按 URL 去重；源站 526 等证书错误会转为中文提示。
- Payload：章节 URL 使用源站章节 URL，不额外封装自定义 payload。
- 已知限制：成人内容源；部分网络环境可能需要代理；源站使用 Cloudflare，526 表示源站 HTTPS 证书异常，属于源站或访问链路问题，插件不会绕过或切换非官方来源；图片依赖源站 `lazy-read` 结构；当前多组筛选不会同时组合，只选优先级最高的一项。

## 验证样例

- 搜索关键词：待补充。
- 详情页样例：待补充。
- 章节样例：`https://se8.us/index.php/chapter/{id}`，待补充具体 URL。

## 更新记录

- 0.0.1：按插件规范补全文档；实现分类、搜索、详情、章节图片、请求超时、图片尺寸探测兜底和 526 中文提示。
