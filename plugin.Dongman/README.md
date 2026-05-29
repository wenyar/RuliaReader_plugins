# 咚漫漫画 Rulia 插件

在 Rulia 里阅读 dongmanmanhua.cn 的漫画。

数据来源：https://www.dongmanmanhua.cn/

插件图片：`icon.png` 为随插件维护的咚漫横向展示图，`package.json` 中 `icon` 与 `cover` 均指向该文件。

## 接口与逻辑说明

- 分类页：分类浏览默认请求 `https://www.dongmanmanhua.cn/genre`，排行榜请求 `/top`，按周更新和连载/完结请求 `/dailySchedule`。
- 搜索页：关键词搜索请求 `https://www.dongmanmanhua.cn/search?keyword={keyword}`。
- 筛选项：`category` 同时承载题材、排行榜、周几更新、连载和完结状态，值如 `LOVE`、`top:ALL`、`daily:MONDAY`、`daily:ONGOING`。
- 分页换算：咚漫分类页通常一次返回完整列表，插件在本地按 Rulia 的 `page` 与 `pageSize` 切片。
- 详情页：请求 `/list?title_no={id}`，解析标题、简介、封面，并解析当前页章节列表。
- 章节目录：详情页章节可能分页，插件会探测最大页数并以有限并发请求各页，合并后按阅读顺序返回。
- 章节图片：请求 `/viewer?title_no={id}&episode_no={id}`，解析 class 包含 `_images` 的图片节点，读取 `data-url` 或 `src`。
- 图片地址：图片地址统一转为 HTTPS；`getImageUrl` 直接返回最终地址。
- 核心逻辑：详情和章节图片做内存缓存；网络请求设置 15 秒超时，避免源站无响应时页面长时间卡住；章节分页并发数为 6；图片宽高优先使用页面属性，缺省为 `800 x 1200`。
- Payload：章节 URL 使用源站 viewer URL，不额外封装自定义 payload。
- 已知限制：部分作品或章节可能受版权、地区、付费策略影响；分类页结构变更会影响本地切片和章节分页解析。

## 验证样例

- 搜索关键词：待补充。
- 详情页样例：待补充。
- 章节样例：`https://www.dongmanmanhua.cn/viewer?title_no=...&episode_no=...`，待补充具体 URL。

## 更新记录

- 0.0.1：按插件规范补全文档；实现分类、搜索、详情、完整章节分页、章节图片解析和请求超时。
