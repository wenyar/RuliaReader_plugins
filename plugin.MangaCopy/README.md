# 拷贝漫画 Rulia 插件

在 Rulia 里阅读 mangacopy.com 的漫画。

数据来源：https://www.mangacopy.com/

## 接口与逻辑说明

- 列表页：优先请求 `https://api.2024manga.com/api/v3/comics`，每次只取 1 页 30 条；如果 API 在 Rulia 中请求失败，则回退到 `https://www.mangacopy.com/comics` 的 HTML 列表解析。筛选支持题材 `theme`、地区 `region`、状态 `status`，排序支持源站当前暴露的 `ordering=-datetime_updated`、`ordering=datetime_updated`、`ordering=-popular`。由于移动端 API 当前会忽略状态参数，选择状态时会直接使用网页 HTML 列表。
- 搜索接口：请求 `https://api.2024manga.com/api/v3/search/comic?offset=0&platform=3&limit=30&q=关键词`，读取接口 JSON 的 `results.list`。
- 详情页：优先请求移动端接口 `https://api.2024manga.com/api/v3/comic/{path_word}`，解析标题、简介、封面、作者、分级和标签；网页详情 `/comic/{path_word}` 仅作为备用。
- 章节目录：优先请求移动端接口 `https://api.2024manga.com/api/v3/comic/{path_word}/group/default/chapters`，读取 `results.list[].uuid/name`；网页加密目录 `/comicdetail/{path_word}/chapters` 仅作为备用。
- 章节图片：优先请求移动端接口 `https://api.2024manga.com/api/v3/comic/{path_word}/chapter/{uuid}`，读取 `results.chapter.contents[].url`；网页阅读页 `contentKey` 解密仅作为备用。
- 图片地址：章节图片、封面和列表图都直接使用源站返回的原始 CDN 地址，不强制改写格式，避免部分漫画缺少变体时出现 404。
- 核心逻辑：列表、详情和图片结果做内存缓存；插件内置 AES-CBC 解密作为网页备用解析，不依赖宿主环境的 `window.crypto.subtle`。
- Payload：章节 URL 使用源站原始 `/comic/{path_word}/chapter/{uuid}`，没有额外自定义 payload。

## 验证样例

- 搜索关键词：海贼王，搜索接口返回 `海贼王`、`海賊王 艾斯`、`海贼王盛宴` 等结果。
- 详情页样例：https://www.mangacopy.com/comic/woduzishenji
- 章节样例：https://www.mangacopy.com/comic/woduzishenji/chapter/991d033c-a419-11eb-a88c-024352452ce0

## 已知限制

- 源站首页提示大陆无障碍访问地址为 `https://www.2026copy.com/`；本插件按用户指定的 `https://www.mangacopy.com/` 生成，网络不可达时可考虑后续改为镜像域名。
- 章节目录和章节图片依赖源站脚本里的 AES 加密规则；源站修改 key、加密方式或接口字段后需要更新插件。
- 若移动端 API 变更或失效，会回退网页 AES 解析；源站同时限制移动端 API 与网页阅读页时，章节图片可能失败。
- 源站可能存在地区限制、临时 EOF、限流、广告脚本或登录相关策略，插件不会保存账号、密码、token 或 cookie。

## 更新记录

- 0.0.1：初始版本，支持列表、搜索、详情、章节目录和章节图片解密解析。
- 0.0.2：修复列表误读轮播/推荐内容导致漫画名为 slug、重复结果和异常详情 URL 的问题；搜索改为源站 JSON 接口；详情目录接口失败时保留开始阅读章节兜底。
- 0.0.3：详情页优先使用页面内开始阅读章节，避免目录接口在 Rulia 内长时间 loading；排序项改为源站实际支持的最近更新、更新时间倒序和热门。
- 0.0.4：修正章节目录接口为 GET，恢复完整章节列表；目录接口增加 8 秒硬超时，失败时才退回开始阅读章节。
- 0.0.5：章节目录接口改用最小请求头并把超时缩短到 3 秒；兜底章节标题会显示完整目录失败原因，便于定位 Rulia 内实际错误。
- 0.0.6：目录接口超时调整为 5 秒，避免源站正常 3 秒左右响应被误判失败；修正目录 AES 解密分支，必须解出 `groups.*.chapters` 才认为成功。
- 0.0.7：取消目录接口短超时，改为并行请求详情页和章节目录，避免 Rulia 内请求稍慢时过早兜底；验证《愛寐七公主》可返回 111 个章节。
- 0.0.8：章节目录增加主域和 `2026copy.com` 镜像竞速，并恢复 12 秒硬超时，避免 Rulia 内无限 loading。
- 0.0.10：退回完整目录接口，避免 `?dnts=3` 快速接口只返回空目录壳；目录等待上限调到 25 秒。
- 0.0.11：首页列表改用更快的 JSON API；目录等待上限缩短到 8 秒；阅读页为空时增加章节图片 API 兜底并返回更明确的错误。
- 0.0.12：列表每次只请求 1 页 30 条，避免 Rulia 传入大 pageSize 时连续请求多页；章节目录超时降到 2.5 秒；图片 API 兜底减少为单域名。
- 0.0.13：保留列表单页优化，章节目录等待恢复到 12 秒，避免过早中断导致完整目录查不到；兜底章节不再显示底层请求错误。
- 0.0.14：首页 API 请求失败时回退 HTML 列表；章节目录解密支持 `build.groups` 结构，避免有效目录被误判为空。
- 0.0.15：按真实接口链路修复目录竞速，空目录响应不再抢先结束；阅读页主站空 `contentKey` 时重试 `2026copy.com`。
- 0.0.16：章节目录和图片优先改用稳定的 `api.2024manga.com` 移动端 JSON 接口；内置 AES-CBC 解密，网页解析只作备用。
- 0.0.17：首页和搜索也切到 `api.2024manga.com`；详情页并行请求详情 HTML 和移动端目录，并缓存章节目录，减少等待。
- 0.0.18：图片 URL 优先使用 jpg 兼容变体，降低移动端 `.webp` 图片在阅读器中偶发加载失败的概率。
- 0.0.19：撤回章节图片 URL 的 jpg 强制转换，修复部分漫画缺少 jpg 变体导致 404 的问题。
- 0.0.20：撤回封面和列表图 URL 的格式转换；详情页 HTML 增加 `2026copy.com` 镜像兜底，减少成人漫画详情页 404。
- 0.0.21：详情页优先改用移动端详情 JSON，修复成人/付费漫画网页详情为 SPA 空壳或资源 404 时无法进入详情页的问题。
- 0.0.22：补全筛选项，增加源站移动端返回的 20 个普通题材、10 个女性成人标签和 10 个男性成人标签。
- 0.0.23：按网页筛选面板调整筛选项：移除男性/女性标签，补全题材列表，增加地区、状态筛选。
- 0.0.24：修正状态筛选参数为网页端实际使用的 `status=0/1/2`；选择状态时改走 HTML 列表解析，避免移动端 API 忽略状态导致结果相同。
