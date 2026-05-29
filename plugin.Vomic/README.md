# vomic漫 Rulia 插件

在 Rulia 里阅读 vomicmh.com 的漫画。

数据来源：https://vomicmh.com/

插件图片：`icon.png` 为随插件维护的 vomic漫横向展示图，`package.json` 中 `icon` 与 `cover` 均指向该文件。

## 接口与逻辑说明

- 列表页：首页浏览请求 `https://vomicmh.com/`；分类请求 `https://vomicmh.com/so/cate/{category}/{page}`；关键词搜索请求 `https://vomicmh.com/so/key/{keyword}/{page}`。
- 筛选项：`category` 支持冒险、搞笑、动作、科幻、爱情、侦探、竞技、校园、百合、耽美、热血、都市等源站分类 ID。
- 分页换算：首页只解析第一页；搜索和分类页按源站每页约 12 条处理，插件会收集多个源站页后按 Rulia 的 `pageSize` 切片。
- 详情页：请求 `/detail/{id}`，解析 og 标题、description、og:image 和章节列表；如果 HTML 链接不足，会尝试解析页面中的章节 JSON 片段。
- 章节图片：请求 `/chapter/{mangaId}/{chapterId}`，从页面中提取 `https://cdm.vomicer.com/` 图片，按漫画 ID、identity 和页码分组，选择页数最多的一组作为正文图片。
- 图片地址：图片地址必须来自 `cdm.vomicer.com`，会过滤封面和裁剪图；`getImageUrl` 直接返回最终地址。
- 核心逻辑：详情和章节图片做内存缓存；支持旧版宿主调用参数；筛选 JSON 解析失败时按空筛选处理。
- Payload：章节 URL 使用源站章节 URL，不额外封装自定义 payload；关键字段来自 `/chapter/{mangaId}/{chapterId}` URL 和图片路径中的 identity。
- 登录态：章节图片需要登录态。请在 RuliaReader 中为 `vomicmh.com` 保存 `_token` cookie，插件不保存账号、密码或 token。
- 已知限制：未登录或 cookie 失效会导致章节图片失败；首页没有稳定分页；源站图片域、登录策略或页面脚本变化时需要更新插件。

## 验证样例

- 搜索关键词：待补充。
- 详情页样例：待补充。
- 章节样例：`https://vomicmh.com/chapter/{mangaId}/{chapterId}`，待补充具体 URL。

## 更新记录

- 0.0.1：按插件规范补全文档，保持版本号为初始版本。
