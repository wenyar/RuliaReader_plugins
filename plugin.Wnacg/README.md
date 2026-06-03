# 紳士漫畫 Rulia 插件

在 Rulia 里阅读 wnacg.com 的漫画和图集。

数据来源：https://www.wnacg.com/

## 接口与逻辑说明

- 列表页：`/albums-index-page-{page}.html`，分类页：`/albums-index-page-{page}-cate-{category}.html`。
- 搜索页：`/search/index.php?q={keyword}&m=&f=_all&s=create_time_DESC&p={page}`。
- 详情页：`/photos-index-aid-{aid}.html`，解析标题、封面、分类、页数、标签和简介。
- 章节目录：WNACG 的一个相册按一本书处理，详情中返回单个 `全篇` 章节，章节 URL 使用 `/photos-slide-aid-{aid}.html`。
- 章节图片：请求 `/photos-item-aid-{aid}.html`，从返回脚本里的 `page_url` 数组解析最终图片地址。
- 图片地址：`getImageUrl` 直接返回最终图片 URL；图片 CDN 通常可直连。
- 核心逻辑：列表与搜索使用 `ul.cc li` / `photos-index-aid` 链接去重；章节图片按 `aid` 做内存缓存。

## Cookie 与 Cloudflare

当前 wnacg.com 对普通非浏览器请求会返回 Cloudflare JS/cookie 验证页。这个插件要求 Rulia 能共享已通过验证的浏览器 cookie。请先在 Rulia 共享的浏览器里打开 `https://www.wnacg.com/` 并完成验证，再使用插件。

插件不保存账号、密码、cookie 或 token。

## 筛选项

- 分类：全部、CG画集、Cosplay、同人志/杂志短篇/单行本/韩漫的常用语言分类。

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
