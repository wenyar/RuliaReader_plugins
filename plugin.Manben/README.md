# 漫本 Rulia 插件

在 Rulia 里阅读 manben.com 的漫画。

数据来源：https://www.manben.com/

## 接口与逻辑说明

- 列表页：使用 `GET https://www.manben.com/pagerdata.ashx?t=2&pageindex=...&sc=1&tsort=...&tagid=...&tst=...&tarea=...&tgroup=...&tnm=...`。源站每页约 10 条，插件按 `pageSize` 换算需要请求的源站页数。
- 搜索页：使用 `/search?page={page}&title={keyword}&language=1`，从 `bookList_2` 下的搜索结果 HTML 解析标题、详情链接、封面和简介。
- 筛选项：支持状态、标签、受众、地区和排序，取自源站分类页内联脚本和侧栏。
- 详情页：详情 URL 形如 `/mh-shanhainizhan1/`，只在 `comicInfo` 作品信息区解析标题、封面、简介和作者/类别/状态，章节链接读取 `/m{id}/`。源站详情页章节通常倒序展示，插件会反转为从旧到新。
- 章节图片：阅读页 JS 会调用 `/imageshow.ashx?cid={chapterId}&page={page}&showtype=1&ispre=0`，接口返回 `var chapterimage={...};`。插件逐页请求直到 `IsEnd=true`，拼接 `ImagePix + Images[]` 作为最终图片地址。
- 图片地址：`imageshow.ashx` 不能带 `Referer` 或 Ajax 头；否则会返回需要 Referer 才能读取的图片 key。插件使用普通 GET 取得可直连 key，`getImageUrl` 直接返回原地址。
- 缓存：详情页和章节图片列表做内存缓存，减少重复请求。

## Payload

插件不自定义章节 payload，章节 URL 直接使用源站 `/m{id}/` 地址。`getChapterImageList` 从 URL 中提取数字章节 ID 后请求 `imageshow.ashx`。

## 验证样例

- 分类列表：`pagerdata.ashx` 第 1 页返回 `火锅家族第八季`。
- 搜索关键词：`妖神`，返回 `妖神记`。
- 详情页样例：https://www.manben.com/mh-shanhainizhan1/
- 章节样例：https://www.manben.com/m518897/
- 章节图片样例：`https://manhua1032-61-174-50-98.cdndm5.com/34/33991/518896/14_4664.jpg?...`，直连返回 `image/jpeg`。

## 已知限制

- 章节图片接口需要逐页请求，长章节会比一次性接口慢。
- 源站 CDN 域名和 `key` 参数由 `imageshow.ashx` 动态返回，旧图片地址可能随时间失效，应以插件运行时解析为准。
- 若源站触发验证码、限流或地区访问限制，插件会受源站策略影响。

## 更新记录

- 0.0.4：详情页封面优先从当前作品 `comicInfo` 区块解析，避免误取右侧排行/推荐漫画封面导致不同作品显示同一张图。
- 0.0.3：修正详情简介解析范围，只读取 `comicInfo` 内的作品简介，避免混入侧栏排行榜和章节目录。
- 0.0.2：列表接口改为 GET 查询串，避开 Rulia 宿主对 POST body 的兼容差异。
- 0.0.1：初始版本，支持分类、搜索、详情、章节图片和基础筛选。
