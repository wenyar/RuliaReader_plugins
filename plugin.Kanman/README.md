# 看漫画 Rulia 插件

在 Rulia 里阅读 kanman.com 的漫画。

数据来源：https://www.kanman.com/

插件图片：`icon.png` 为随插件维护的看漫画横向展示图，`package.json` 中 `icon` 与 `cover` 均指向该文件。

## 接口与逻辑说明

- 分类页：默认列表请求 `https://www.kanman.com/sort/`，题材页请求 `/sort/{category}.html`，分页请求 `/sort/{category}_p{page}.html`；源站分页 404 会按无更多结果处理。
- 搜索接口：关键词搜索调用 `https://www.kanman.com/api/getsortlist/?pageno={page}&pagesize={pageSize}&search_key={keyword}&sortby=anim_renqi`。
- 筛选项：`category` 支持全部、热血、冒险、恋爱、玄幻、古风、都市、穿越、修真、搞笑、悬疑等题材。
- 分页换算：分类页按源站约 40 条一页处理，插件会先收集足够的源站页，再按 Rulia 的 `page` 和 `pageSize` 本地切片，避免小页大小时过早跳到源站下一页；搜索接口直接传入 Rulia 页码和页大小。
- 详情页：请求 `https://www.kanman.com/{comicId}/`，解析标题、简介、封面和 HTML 章节；同时尝试章节 API。
- 章节目录：优先比较 HTML 章节和 `https://www.kanman.com/api/getchapterlist/?comic_id={comicId}` 的数量，使用更完整的一组。
- 章节图片：章节 payload 含漫画 ID 和章节 newid，优先调用 `https://www.kanman.com/api/getchapterinfov2?comic_id={comicId}&chapter_newid={chapterNewId}&isWebp=1&quality=high`。
- 图片地址：API 返回图片会统一转 HTTPS；`getImageUrl` 直接返回最终地址。
- 核心逻辑：详情和章节图片做内存缓存；网络请求设置 15 秒超时，避免源站或 API 无响应时页面长时间卡住；分类分页会按 Rulia 页码本地切片，源站分页 404 时按无更多结果处理；付费或授权章节会返回中文提示；图片宽高缺省 `800 x 1200`。
- Payload：章节 URL 形如 `kanman://m={comicId}&n={chapterNewId}&id={chapterId}`，分别表示作品 ID、章节 newid 和可选章节 ID。
- 已知限制：章节图片依赖源站 API 和图片域名；源站限流、付费权限或接口改版时可能需要更新插件。

## 验证样例

- 搜索关键词：待补充。
- 详情页样例：待补充。
- 章节样例：`kanman://` payload，待联网验证后补充具体作品。

## 更新记录

- 0.0.1：按插件规范补全文档；实现分类、搜索、详情、章节目录、章节图片、请求超时、分类分页切片和源站分页 404 兜底。
