# RuliaReader 插件合集

这个仓库用于维护 RuliaReader 的漫画源插件。每个插件对应一个漫画网站，插件目录命名为 `plugin.PluginName`，同名 `.zip` 文件用于导入 RuliaReader。

## 相关链接

- RuliaReader 项目地址：[RuliaReader/Rulia](https://github.com/RuliaReader/Rulia)
- 插件开发 Wiki：[Plugin system](https://github.com/RuliaReader/Rulia/wiki/Plugin-system)

## 使用方式

1. 下载需要的 `plugin.PluginName.zip`。
2. 在 RuliaReader 中导入该 zip 插件。
3. 如果插件说明里标注需要登录态，请先在 RuliaReader 内为对应网站保存 cookie。

## 插件列表

| 插件 | 对应网站 | 目录 | 状态 | 说明 | 注意事项 |
| --- | --- | --- | --- | --- | --- |
| 二次元動漫 | [2animx.com](https://www.2animx.com/) | `plugin.2Animx` | 可用 | 支持漫画大全、筛选、搜索、详情、章节目录和章节图片。 | 章节页图片需从 `img.2animx.com` 改写到 `www.2animx.com/upload/...` 后直连；部分旧图若返回伪 `404` 图片会尝试同页数重传章节兜底。 |
| 包子漫画 | [baozimh.org](https://baozimh.org/) | `plugin.Baozi` | 可用 | 支持浏览、搜索、详情、章节目录和章节图片。 | 源站接口或图片域名可能变化；如果图片加载失败，优先检查源站是否可访问。 |
| 咚漫漫画 | [dongmanmanhua.cn](https://www.dongmanmanhua.cn/) | `plugin.Dongman` | 可用 | 支持分类浏览、关键词搜索、详情和章节图片。 | 分类页会返回完整列表，插件本地分页；部分作品可能受版权、地区或站点策略影响。 |
| 漫画屋 | [e728.com](https://www.e728.com/) | `plugin.E728` | 可用 | 支持分类浏览、常用入口筛选、搜索、详情、章节目录和章节图片。 | 章节图片来自 `manhua.5um.net`，封面来自 `comic.5um.net`；若图片 CDN 调整，需要更新解析规则。 |
| GoDa漫画 | [godamh.com](https://godamh.com/) | `plugin.GoDa` | 可用 | 支持列表、搜索、分类筛选、详情、全量章节目录和章节图片。 | 源站可能存在访问限制或接口变动；异常时先确认网站本身能否打开。 |
| 爱奇艺叭嗒 | [iqiyi.com/manhua](https://www.iqiyi.com/manhua) | `plugin.Iqiyi` | 受源站权限影响 | 支持分类浏览、关键词搜索、详情、完整章节目录和章节图片。 | 部分付费、版权或地区限制章节会按源站返回结果处理。 |
| 看漫画 | [kanman.com](https://www.kanman.com/) | `plugin.Kanman` | 可用 | 支持分类浏览、搜索、详情、章节目录和章节图片。 | 章节图片依赖源站接口和图片域名；源站限流或接口变化时可能需要更新插件。 |
| 拷贝漫画 | [mangacopy.com](https://www.mangacopy.com/) | `plugin.MangaCopy` | 可用 | 支持列表、搜索、详情、章节目录和章节图片解密解析。 | 源站当前提示大陆无障碍访问地址为 `2026copy.com`；插件按 `mangacopy.com` 生成，章节目录和图片依赖源站 AES 加密规则。 |
| 漫本 | [manben.com](https://www.manben.com/) | `plugin.Manben` | 可用 | 支持分类、搜索、详情、章节目录和章节图片。 | 章节图片逐页调用源站 `imageshow.ashx`，图片 CDN 地址和 key 由源站动态返回，可能随时间失效。 |
| 漫画站 | [manhuazhan.org](https://www.manhuazhan.org/) | `plugin.Manhuazhan` | 可用 | 支持分类、状态筛选、详情、章节列表和章节图片解密解析。 | 图片解析依赖源站页面脚本和加密规则，源站改版后可能失效。 |
| nHentai | [nhentai.net](https://nhentai.net/) | `plugin.Nhentai` | 可能需要代理 | 使用官方域名和 API，支持语言、标签、排序、搜索、详情和图片读取。 | 成人内容源；在部分网络环境可能需要代理；API 可能限流，插件会尽量使用缓存兜底。 |
| Se8 | [se8.us](https://se8.us/) | `plugin.Se8` | 可能需要代理 | 支持分类浏览、标题搜索、详情页、章节列表和章节图片解析。 | 成人内容源；部分网络环境可能需要代理；图片依赖源站 `lazy-read` 地址。 |
| vomic漫 | [vomicmh.com](https://vomicmh.com/) | `plugin.Vomic` | 需要登录 | 支持浏览、分类、搜索、详情、章节目录和章节图片。 | 章节图片需要登录态；请在 RuliaReader 中为 `vomicmh.com` 保存 `_token` cookie，插件不会保存账号、密码或 token。 |
| 紳士漫畫 | [wnacg.com](https://www.wnacg.com/) | `plugin.Wnacg` | 需要 cookie | 支持分类浏览、搜索、详情和整本图片列表解析。 | 成人内容源；源站有 Cloudflare 验证，请先在 Rulia 共享的浏览器中完成验证并保存 cookie。 |

## 注意事项

- 插件只负责解析公开网页或源站接口，不内置漫画内容。
- 需要登录的网站，请在 RuliaReader 中保存对应站点 cookie；插件不会保存或内置账号、密码、token。
- 部分网站可能存在地区限制、访问频率限制、付费章节、版权限制或临时反爬策略。
- 如果列表、详情或图片突然不可用，通常需要先确认源站网页是否还能正常访问，再判断是否需要更新插件解析逻辑。
- 成人内容插件已经在列表中标注，请按当地法律法规和个人需要使用。

## 开发规范

插件生成和维护要求见 [PLUGIN_GENERATION_SPEC.md](./PLUGIN_GENERATION_SPEC.md)。
