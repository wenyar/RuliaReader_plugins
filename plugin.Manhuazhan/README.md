# 漫画站 Rulia 插件

在 Rulia 里阅读 manhuazhan.org 的漫画。

数据来源：https://www.manhuazhan.org/，源站超时或请求取消时会按相同路径重试 `https://www.manhuazhan.com/` 镜像。

插件图片：`icon.png` 为随插件维护的漫画站横向展示图，`package.json` 中 `icon` 与 `cover` 均指向该文件。

## 接口与逻辑说明

- 分类页：请求 `https://www.manhuazhan.org/category/list/{category}`，状态筛选会追加 `/finish/{status}`，分页追加 `/page/{page}`。
- 搜索页：关键词搜索请求 `https://www.manhuazhan.org/search?key={keyword}`，分页时追加 `page={page}`；源站要求验证码时，插件只提示用户完成正常验证，不绕过验证码。
- 筛选项：`category` 支持全部、国产漫画、日本漫画、韩国漫画、欧美漫画；`status` 支持全部、连载、完结。
- 分页换算：源站单页按 24 条处理，插件按 Rulia 的 `pageSize` 请求多个源站页并合并去重。
- 详情页：请求 `/comic/{id}`，解析标题、简介、封面和章节列表；若 `.org` 响应超时或请求被取消，会切换同路径 `.com` 镜像重试；若页面出现安全验证或源站提示漫画已删除，则返回中文错误。
- 章节图片：请求 `/chapter/{comicId}-{chapterId}.html`，从页面脚本读取 `cid` 和加密 `DATA`，解密后得到图片数组。
- 图片地址：图片地址会清理空白图，并将部分旧包子漫画静态域替换为 `https://s2.bzcdn.net/`；`getImageUrl` 直接返回最终地址。
- 核心逻辑：详情和章节图片做内存缓存；网络请求设置 12 秒超时，超时或请求取消时会尝试同路径 `.com` 镜像；底层取消或 526 等错误会转换为中文提示；章节目录会从目录容器、章节列表区域和页面全文依次尝试解析；图片解密使用内置 key 表按 `cid` 取 key；图片宽高优先使用解密数据，缺省 `800 x 1200`。
- Payload：章节 URL 使用源站章节 URL，不额外封装自定义 payload；关键参数来自页面脚本中的 `var cid` 和 `var DATA`。
- 已知限制：章节图片强依赖源站脚本字段和加密规则；源站删除的漫画无法读取目录；搜索验证码需要用户在源站正常完成验证，插件不会绕过；安全验证、接口改版、两个域名同时不可用或图片域替换规则变化都会导致解析失败。

## 验证样例

- 搜索关键词：待补充。
- 详情页样例：待补充。
- 章节样例：`https://www.manhuazhan.org/chapter/{comicId}-{chapterId}.html`，待补充具体 URL。

## 更新记录

- 0.0.1：按插件规范补全文档；实现分类、搜索、详情、章节目录、章节图片解密、请求超时、同路径镜像重试、验证码提示和已删除作品提示。
