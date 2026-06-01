# 二次元動漫 Rulia 插件

在 Rulia 里阅读 https://www.2animx.com/ 的漫画。

数据来源：https://www.2animx.com/

## 接口与逻辑说明

- 列表页：默认读取 `https://www.2animx.com/index-html`，筛选项拼接为 `index-html-status-{status}-typeid-{typeid}-sort-{sort}-page-{page}`。
- 搜索页：读取 `https://www.2animx.com/search-index?searchType=1&q={keyword}`，解析 `ul.liemh/htmls/indliemh` 中的作品卡片；源站搜索分页不稳定，插件只在第 1 页返回搜索结果，后续页返回空列表，并附带常见分页结束字段尝试让宿主停止继续加载。
- 详情页：作品 URL 形如 `index-comic-name-{name}-id-{cid}`，解析标题、简介、封面、作者/状态/类型和章节链接。
- 章节页：章节 URL 形如 `index-look-name-{name}-cid-{cid}-id-{id}`，先读取第一页，使用隐藏字段 `#total` 或标题中的 `第 n / total 頁` 判断页数，再逐页请求 `-p-{page}` 页面。
- 章节 URL：详情页和侧栏偶尔给出 `name` 为章节标题的链接，插件会按漫画标题、`cid`、`id` 重写为稳定章节 URL，避免源站 302 导致宿主拿不到阅读页。
- 图片地址：旧章节图片常写成 `https://img.2animx.com/upload/...`，实际直连可能 404；插件会统一改写为 `https://www.2animx.com/upload/...`。新章节图片常为 `https://image.2animx.com/img/.../{hash}.jpg`，`getImageUrl` 会优先尝试转成 `data:image/jpeg;base64,...`，避免 Rulia 图片组件直接读取该 CDN 时出现 `HRESULT 0x88982F50`。
- 核心逻辑：列表、搜索、章节均做去重；详情和章节图片使用内存缓存；图片宽高无法从页面稳定获得时使用 `800 x 1200`。
- Payload：章节 URL 直接使用源站章节页，不使用自定义 payload。

## 验证样例

- 搜索关键词：`古惑仔`
- 详情页样例：`https://www.2animx.com/index-comic-name-古惑仔-id-254`
- 章节样例：`https://www.2animx.com/index-look-name-古惑仔-cid-254-id-9170`
- 章节图片直连样例：`https://www.2animx.com/upload/0w/2b/254/1/1.jpg`

## 已知限制

- 源站最新更新页在部分时间可能没有作品列表，插件默认使用漫画大全页和搜索页作为入口。
- 搜索分页参数按站点表单推断；如果源站调整分页规则，后续页可能只返回第一页或空列表。
- 旧图片地址必须改写到 `www.2animx.com/upload/...` 后再交给 Rulia 加载；新 hash 图片无法从第一页推导全章，插件会以小批量并发方式读取各页，并在图片加载阶段尝试 data URL 兜底。

## 更新记录

- 0.0.16：`getImageUrl` 会识别源站返回 `200 image/jpeg` 但内容实际为 `404` 的伪图片，并提示“源站图片缺失”，避免交给图片控件后显示 HRESULT。
- 0.0.15：修复 payload 章节 URL 下，跨 `cid` 替换章节时内部仍把 payload 当源站网页请求的问题，恢复《非人哉》等旧条目替换逻辑。
- 0.0.14：章节列表改用 ASCII payload 保存 `cid/id/route/title`，避免宿主保存中文章节 URL 时出现问号、编码或重定向问题。
- 0.0.13：HTML 请求增加 `fetch` 跟随重定向兜底；章节 URL 会额外尝试 `name-x-cid-...-id-...` 安全占位路由，让未知漫画按 `cid/id` 由源站自动跳到真实章节页。
- 0.0.12：`cid=32760` 的《非人哉》旧条目图片文件已失效，读取章节图片时自动切换到 `cid=21999` 的同回数可读章节。
- 0.0.11：补充《非人哉》另一个条目的 `cid=32760` 路由修复，处理宿主传入 `name-????????` 的章节地址。
- 0.0.10：增加 `cid -> 漫画路由名` 修复表和运行时缓存，修复宿主把中文章节路由传成 `???????????` 时无法解析图片的问题。
- 0.0.9：章节地址自修复增加乱码路由恢复，并在仍失败时输出候选地址，方便定位宿主实际传入的 URL。
- 0.0.8：`getChapterImageList` 会对传入的旧章节 URL 做自修复，处理缓存地址中标题标点和 `后/後` 路由差异导致的无法解析图片。
- 0.0.7：移除章节解析阶段的图片二进制探测，避免正常旧章节被额外请求影响；保留长标题路由修复，并在目录中优先使用同话数的页数标注重传章节。
- 0.0.6：章节 URL 优先使用详情页真实路由名，修复标题含 `、` 等符号时阅读页跳转错误的问题。
- 0.0.5：搜索结果增加 `hasNextPage: false` / `totalPage: 1` 等分页结束兼容字段，减少宿主继续加载空页导致的转圈。
- 0.0.4：修复旧章节同一话混用 `.jpg` / `.png` 时后续页 404 的问题，并避免搜索翻页重复返回同一批结果。
- 0.0.3：为 `image.2animx.com` 新图增加 data URL 兜底，修复《非人哉》等作品图片组件加载失败的问题。
- 0.0.2：修复部分章节 URL 使用章节标题导致无法解析图片的问题，并加快新 hash 图片章节的解析。
- 0.0.1：初始版本，支持列表、筛选、搜索、详情、章节和图片地址改写。
