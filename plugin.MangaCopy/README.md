# 拷贝漫画 Rulia 插件

在 Rulia 里阅读 `https://www.2026copy.com/` 的漫画。

## 数据来源

- 列表页：`https://www.2026copy.com/comics`
- 搜索接口：`https://www.2026copy.com/api/kb/web/searchci/comics`
- 详情页：`https://www.2026copy.com/comic/{path_word}`
- 章节目录接口：主用 APK 提取出的移动端接口 `https://api.manga2026.xyz/api/v3/comic/{path_word}/group/default/chapters`；`mapi.mangacopy.com`、`api.manga-copy.com` 和网页加密接口作为兜底
- 阅读页：优先网页阅读页 `https://www.2026copy.com/comic/{path_word}/chapter/{uuid}` 并解析 `contentKey`；移动端图片接口作为兜底

## 解析逻辑

- `/comics` 页面把漫画数组放在 `.exemptComic-box` 的 `list` 属性里，插件直接解析该属性，不抓轮播和推荐位。
- 移动端目录接口来自官方 APK `copymanga.release_20260525_3.0.8.apk` 的 Flutter AOT 字符串表。
- 网页章节目录接口返回 JSON，`results` 是加密字符串。官网前端逻辑为：
  - 前 16 字符作为 UTF-8 IV；
  - 后续内容是 hex 密文；
  - key 来自详情页 `var ccz = 'op0zzpvv.nmn.00p'`；
  - 使用 AES-CBC / PKCS7 本地解密。
- 网页阅读页图片同理，前端使用页面里的 `contentKey` 和 `var cct = 'op0zzpvv.nmn.00p'` 本地解密图片数组。

## 重要限制

- 直连测试中，`/comicdetail/{path_word}/chapters` 可以正常返回并解密，但对部分漫画解出的结果是空目录壳：`groups.default.chapters: []`。
- 直连测试中，网页阅读页不带 `webp=1` cookie 时可能返回空 `contentKey`；插件会主动携带该 cookie。
- 为降低兼容风险，列表、搜索、详情和阅读页仍优先使用 web 端；只有完整章节目录优先使用移动端 API。

## 更新记录

- 0.0.58：增强偶发失败稳定性：详情页 web 请求增加多域名重试与 `webp=1` cookie；移动端目录、详情兜底和图片兜底均增加两轮重试；web 详情全失败时用移动端详情补标题、封面和简介，避免显示 path_word 与占位封面。
- 0.0.57：按最小改动策略回退：列表、搜索、详情和阅读页恢复 web 端主链路，仅章节目录优先使用 APK 移动端接口，避免 v0.56 在 Rulia 首页返回空列表。
- 0.0.56：首页列表、搜索和详情元数据也切到 APK 移动端 API；移动端失败时才回退网页，且列表请求失败不再让首页整页报错。实测首页 3.6 秒返回 30 本，搜索 3.0 秒返回 30 条，详情页 3.2 秒返回 205 章。
- 0.0.55：从官方 APK 中提取并切换到 `api.manga2026.xyz` 移动端接口；章节目录和阅读图片均优先走移动端 API，实测《魔都精兵的奴隶》详情页 1.7 秒返回 205 章，第 01 话 0.8 秒返回 61 张图。
- 0.0.54：章节目录接口按 Postman 成功条件补充 `cookie: webp=1` 和 `priority: u=1, i` 请求头；实测该组合可解出《魔都精兵的奴隶》205 个章节。
- 0.0.53：按官网前端顺序改为先请求详情页，再请求 `https://www.2026copy.com/comicdetail/{path_word}/chapters`；确认直接/过早请求目录会解出空目录，先访问详情页后可解出 205 个章节。
- 0.0.52：详情页改为并行请求详情 HTML 和 `https://www.2026copy.com/comicdetail/{path_word}/chapters`，不再等详情页返回后才请求目录；本地测试《魔都精兵的奴隶》约 1.2 秒返回 205 个章节。
- 0.0.51：详情页不再同步请求完整章节目录，直接使用详情页 HTML 自带的真实“开始阅读”链接，避免 Rulia 运行时目录请求卡住导致详情页一直 loading。
- 0.0.50：修复章节目录请求的超时保护写法，避免详情页在目录请求卡住时一直 loading；章节解析优先使用 `groups.default.chapters`，避免把单行本和其它汉化分组混入默认章节列表。
- 0.0.49：恢复 `https://www.2026copy.com/comicdetail/{path_word}/chapters` 为详情页主章节目录接口，等待上限调到 15 秒；接口失败时才退回详情页自带“开始阅读”链接。
- 0.0.48：详情页不再等待移动端目录接口；2026copy/mangacopy 网页请求全程携带 `webp=1` cookie，并把网页目录接口降为 3 秒快速尝试，失败后立即显示详情页自带真实“开始阅读”入口。
- 0.0.47：详情页完整目录等待从 3 秒调到 10 秒，避免开代理时 `api.2024manga.com` 目录响应稍慢就过早退回“开始阅读”；仍保留超时兜底，关代理不会无限 loading。
- 0.0.46：详情页目录改为 3 秒竞速：`api.2024manga.com` 完整目录和 2026copy Web 加密目录谁先返回有效目录就使用谁；超时或失败时再退回详情页自带“开始阅读”，兼顾开代理完整目录和关代理不卡死。
- 0.0.45：详情页不再等待关代理时不可达的 `api.2024manga.com` 目录接口；Web 目录只短暂尝试 3 秒，失败后立即显示详情页自带的真实“开始阅读”入口，避免详情页长期 loading。
- 0.0.44：阅读页改为优先请求 Web 章节页并带 `Cookie: webp=1`，修复直连时 `contentKey` 为空导致无法阅读的问题；完整目录失败时保留详情页自带的真实“开始阅读”链接，不再显示为错误章节。
- 0.0.43：网页章节接口兜底改为复刻前端脚本请求方式：`GET /comicdetail/{path_word}/chapters` + `dnts` header + `application/x-www-form-urlencoded`；封面取图时优先尝试去掉 `.328x422.jpg` 的源图地址，减少缩略图 CDN 分片灰块。
- 0.0.42：恢复 `api.2024manga.com` 作为章节目录和章节图片主链路；直连验证《魔都精兵的奴隶》可返回 205 个章节和第 01 话 61 张图片；网页 `contentKey` 为空时不再作为主阅读链路。
- 0.0.41：封面保持 `/comics` 页面返回的原始缩略图地址，不再剥离 `.328x422.jpg` 后缀；详情页请求失败或章节接口为空时始终返回“开始阅读”占位章节，避免 Rulia 把空章节列表显示成错误页。
- 0.0.40：详情页请求失败时不再整页报错，会返回列表缓存的标题和封面；章节为空时允许详情页显示；封面 URL 改为优先使用原图，减少 `.328x422.jpg` 缩略图加载失败导致的灰块。
- 0.0.39：章节接口返回空目录时不再让详情页报错，保留详情页内的“开始阅读”入口并标注失败原因。
- 0.0.38：删除旧的移动端 API 优先逻辑，重做为 `2026copy.com` 网页链路；列表按 `/comics` 页面 `list` 属性解析；目录按官网前端 AES-CBC 逻辑解密；移除未标注的“开始阅读”伪章节兜底。
