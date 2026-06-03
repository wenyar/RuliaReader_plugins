# 紳士漫畫 Rulia 插件

在 Rulia 里阅读 wnacg.com 的漫画和图集。

数据来源：https://www.wnacg.com/

## 接口与逻辑说明

- 默认列表：收藏排行页 `/albums-favorite_ranking-page-{page}-type-{period}.html`，带分类时会尝试 `type-{period}-cate-{category}` 和 `cate-{category}-type-{period}` 两种伪静态顺序。
- 普通分类页：保留 `/albums-index-page-{page}-cate-{category}.html` 解析能力，但当前筛选优先使用排行页。
- 搜索页：`/search/index.php?q={keyword}&m=&f=_all&s=create_time_DESC&p={page}`。
- 详情页：`/photos-index-aid-{aid}.html`，解析标题、分类、页数、标签和简介；封面优先使用列表缓存，其次使用 `photos-item-aid` 的第一张作品图，最后才使用详情页里过滤掉头像/站点图标后的图片。
- 章节目录：WNACG 的一个相册按一本书处理，详情中返回单个 `全篇` 章节，章节 URL 使用 `/photos-slide-aid-{aid}.html`。
- 章节图片：请求 `/photos-item-aid-{aid}.html`，从返回脚本里的 `page_url` 数组解析最终图片地址。
- 图片地址：`getImageUrl` 直接返回最终图片 URL；图片 CDN 通常可直连。
- 核心逻辑：列表与搜索直接解析带 `photos-index-aid` 的封面链接及其内部 `img src`，使用排行榜页给出的原始封面地址，避免额外请求和路径改写导致 404；排行榜分类使用固定枚举值映射到站点 `cate` ID，避免空值下拉或 URL 组合不稳定；封面按作品 URL 缓存；章节图片按 `aid` 做内存缓存。

## Cookie 与 Cloudflare

当前 wnacg.com 对普通非浏览器请求会返回 Cloudflare JS/cookie 验证页。这个插件要求 Rulia 能共享已通过验证的浏览器 cookie。请先在 Rulia 共享的浏览器里打开 `https://www.wnacg.com/` 并完成验证，再使用插件。

插件不保存账号、密码、cookie 或 token。

## 筛选项

- 排行：今日、本周、本月、今年。
- 分类：参考 WNACG 排行页下拉框，包含全部分类、同人志、CG画集、单行本、杂志&短篇、写真&Cosplay、韩漫、3D&漫画、AI女神，以及常用汉化/日语/English/生肉子分类。

## Payload

- 作品 URL：`https://www.wnacg.com/photos-index-aid-{aid}.html`
- 章节 URL：`https://www.wnacg.com/photos-slide-aid-{aid}.html`
- 图片接口：`https://www.wnacg.com/photos-item-aid-{aid}.html`

## 验证样例

- 搜索关键词：待在 Rulia cookie 环境中补充。
- 详情页样例：`https://www.wnacg.com/photos-index-aid-211778.html`
- 章节样例：`https://www.wnacg.com/photos-slide-aid-211778.html`

## 已知限制

- 需要 Rulia 共享浏览器 cookie；无 cookie 的本地直连请求会被 Cloudflare 拦截。
- 如果源站调整 `photos-item-aid` 的脚本结构，章节图片解析需要更新。
- 成人内容源；请按当地法律法规和个人需要使用。

## 更新记录

- 0.0.1：初始版本，支持分类浏览、搜索、详情和 `photos-item-aid` 图片列表解析。
- 0.0.2：补充更多分类筛选项，包括大类、English、AI图集和3D漫画。
- 0.0.3：默认列表改为收藏排行筛选；详情页封面增加列表缓存和首图兜底。
- 0.0.4：修正详情页封面优先级，避免误取上传者头像。
- 0.0.5：列表封面也改用 `photos-item-aid` 第一张作品图优先，减少缩略图错配。
- 0.0.6：默认列表恢复快速封面，增加精确封面模式和 429 重试提示，降低刷新时报错概率。
- 0.0.7：移除精确封面模式；列表封面改为只使用排行榜封面并归一化缩略路径，兼顾速度和一致性。
- 0.0.8：撤回列表封面路径改写，避免缩略图 URL 被改坏后整页无封面。
- 0.0.9：修正列表解析边界，直接读取封面链接内部的 `img src`。
- 0.0.10：分类筛选改为固定非空枚举映射，避免 Rulia 下拉空白和分类 URL 不稳定。
- 0.0.11：收紧列表封面链接正则，避免跨作品卡片导致封面和详情 URL 错配。
