# Persona Nexus Auth

使用者帳號系統的**登入/註冊頁**，是一組多專案微服務架構中的其中一個前端。整體系統的目標是「角色 AI 連結中樞」，這個專案負責使用者註冊與登入。

## 整體架構

現況是**同源部署**：瀏覽器實際打的入口是 Caddy（`localhost:8080`），不是各前端 dev server 或 gateway 的裸 port。

```
瀏覽器
  │
  └─ http://localhost:8080（Caddy 反向代理，同源入口）
        ├─ /login/*  → 本專案 Vite dev server（5173）
        ├─ /（其餘路徑） → persona-nexus-lobby dev server（5175）
        └─ /api/*    → api-gateway（8000）→ auth-service (3000) / user-service (4000) / character-service (5000) / ...
```

`src/config-loader.js` 打相對路徑 `/api/config`，但**只用來探測 api-gateway 是否可達**，不解析
或快取回應內容——這是 `simplify-auth-ui`（2026-07-26）optimization change 的結果，比照
`persona-nexus-lobby` 已驗證過的模式。註冊/登入/導向所需的網址（`src/api.js` 裡的
`/api/auth/register`、`/api/auth/login`，以及 `main.js` 的 `LOBBY_PATH = '/'`）都是寫死的
**相對路徑常數**，不再向 `/api/config` 動態索取絕對網址。這樣做是安全的，因為本專案只透過
Caddy（8080）同源存取，相對路徑與原本組出的絕對網址在瀏覽器裡指向完全相同的位置；直接開裸
port（5173）不受支援（`config-loader.js` 的註解已明講，非本次變更引入的新限制）。

`vite.config.js` 的 `base: '/login/'`、`host: true`、`allowedHosts: true` 是配合這套 Caddy 同源代理的**現行設定**（不是尚未啟用的未來規劃）：`base` 要跟 Caddy 轉發給本專案的路徑前綴對齊，否則資產會用絕對路徑請求、掉進 Caddy 的 catch-all（落到 lobby）。

| 專案 | 角色 | Dev server port | 路徑 |
|---|---|---|---|
| persona-nexus-lobby | 角色大廳，系統首頁 | 5175 | `persona-nexus-platform/persona-nexus-lobby` |
| **persona-nexus-auth**（本專案） | 登入 / 註冊頁 | 5173（`vite.config.js` 固定 + `strictPort: true`） | `persona-nexus-platform/persona-nexus-auth` |
| api-gateway | 統一 API 入口，反向代理到各 service | 8000 | `persona-nexus-platform/api-gateway` |
| auth-service | 處理註冊 / 登入，簽發 JWT | 3000 | `persona-nexus-platform/auth-service` |
| user-service | 使用者資料服務 | 4000 | `persona-nexus-platform/user-service` |

**前端從不直接打各 service，一律打 api-gateway（實務上是先進 Caddy 再轉到 gateway）。**

## 本專案結構

- `index.html` — 註冊/登入表單 UI（兩個表單 + tab 切換），`#messageBox` 帶 `role="status"
  aria-live="polite"`，動態訊息會被螢幕報讀器主動朗讀
- `src/style.css` — 暗色科技風格樣式
- `src/main.js` — DOM 接線、表單事件處理、UI 回饋（`showMessage`）與登入成功後的導向邏輯；
  `init()` 內先呼叫 `config-loader.js` 探測後端可達性，再掛上表單事件監聽器
- `src/api.js` — 集中封裝 `POST /api/auth/register`、`POST /api/auth/login` 的 `fetch()` 呼叫，
  `main.js` 不再直接操作 `fetch`（`simplify-auth-ui` change 新增，解決原本 API 層與 UI 層混雜的問題）
- `src/session.js` — 只有一個函式 `setToken(token)`，登入成功時把 token 寫入 `localStorage`
  （`direct-token-storage` change 新增）。本專案不需要 `getToken()`/`clearToken()`，因為本專案
  自己從不讀取 token
- `src/config-loader.js` — 只探測 `/api/config` 可達性（見上方架構說明），不再回傳/快取任何資料
- `src/main.test.js` — Jest 單元測試（jsdom 環境）。**已修復**：改用 `jest.resetModules()` +
  `require('./main.js')` 取代原本會因 `main.js` 含 `import`/內部 async 初始化而壞掉的 `eval()`
  載入方式；`npx jest` 現況 2/2 全過。測試內容仍只涵蓋「送出表單時按鈕會 disable 並顯示載入
  文字」兩個情境，沒有逐一測試 API 成功/失敗後的訊息文字內容或導向行為的細節
- `vite.config.js` — 固定 dev server port 為 5173、`strictPort: true`，並設定 `base: '/login/'` 配合 Caddy 同源部署

## 關鍵 API 端點

- `POST /api/auth/register`（相對路徑，經 Caddy 轉發至 api-gateway）
- `POST /api/auth/login`

（Gateway 內部會把 `/api/auth/*` `pathRewrite` 成 auth-service 的 `/api/v1/auth/*`）

## 登入/註冊流程

- **註冊成功**：顯示成功訊息、reset 表單。**不會**自動登入或跳轉，使用者需自行切到登入頁。
- **登入成功**：`main.js` 從回應取出 `token`，用 `setTimeout` 延遲 1.5 秒後，在同一個回呼內
  依序執行 `session.js` 的 `setToken(token)`（寫入 `localStorage`，key 為 `'token'`）與
  `window.location.href = LOBBY_PATH`（`LOBBY_PATH` 寫死為 `'/'`，不帶任何 query string）。
  token 由本專案自己直接寫入 `localStorage`，不再透過 URL 交給 `persona-nexus-lobby`
  （`direct-token-storage` change，2026-08-12）——同源部署下（經 Caddy）本專案與 lobby 共享
  同一個 origin 的 `localStorage`，網址傳遞已無必要。
  - 值得注意的細節：這 1.5 秒的 `setTimeout` 期間，`loginForm.reset()` 已先執行，但按鈕要等 `finally` 區塊才會復原成可點擊狀態；這段等待對使用者體感是「登入成功訊息 + 短暫停留」，非 bug，但沒有寫在任何測試裡明確斷言。`setToken()` 的呼叫刻意留在 `setTimeout` 回呼內（不提前執行），維持這段時序不變。

## 已知問題與修法記錄

- **CORS 穿透問題**（已解決）：auth-service 的 CORS 原本只允許 Gateway 的 origin，但 Gateway 用 `http-proxy-middleware` 轉發時，auth-service 的 `Access-Control-Allow-Origin` header 會原封不動傳回瀏覽器，導致瀏覽器（5173）被拒絕。修法是在 api-gateway 的 proxy 裡用 `on.proxyRes` 刪除上游的 CORS header，讓 Gateway 自己的 `cors()` 中介層負責跟瀏覽器溝通。此修法在 api-gateway 專案處理，已確認生效。

## 演進歷史（重要背景）

依《前端系統設計原則》稽核（見 `mistake.md`）後，以 change `simplify-auth-ui`（2026-07-26）
做了一輪清理：
- 刪除 Vite 鷹架殘留死檔案：`counter.js`、`javascript.svg`、`vite.svg`、`hero.png`、`style copy.css`
- 新增 `src/api.js`，把 `fetch()` 呼叫從 `main.js` 的 DOM handler 抽出（解決 API 層與 UI 層混雜、SoC 違反）
- 簡化 `config-loader.js` 為只探測可達性，改用相對路徑常數（比照 `persona-nexus-lobby`，解決
  SSOT／架構方向與同平台不一致的問題）
- 修復壞掉的單元測試（`eval()` 無法處理 `main.js` 的 `import` 陳述式）
- `messageBox` 加上 `aria-live="polite"`（WCAG 4.1.3 可及性修正）
- **本輪刻意不處理**：`persona-nexus-character` 的 `config-loader.js` 仍是舊版重複實作，
  屬於獨立 repo，留待該服務自己的稽核輪次處理

依《網頁架構設計原則》稽核落差 1 後，以 change `direct-token-storage`（2026-08-12）統一
token 傳遞機制：
- 新增 `src/session.js`，`setToken(token)` 是唯一函式
- 登入成功時直接把 token 寫入 `localStorage`，不再透過 URL query string 交給
  `persona-nexus-lobby`（該專案同步以 change `auth-token-handoff-cleanup` 移除對應的
  網址讀取死碼與 `api.js` 的 `setToken()`）
- 本輪刻意不處理：`localStorage` vs `httpOnly` cookie 的存放方案取捨（已與使用者完整討論
  XSS/CSRF 威脅模型，決定另找時間專門評估）、lobby↔character/chat/rpg-scene 的 iframe
  token 傳遞方式統一（獨立的既有落差）、token 生命週期重新設計（現況仍為單層 7 天 token，
  無 refresh、無 revoke）

## 協作慣例

- 使用者目標是**學習如何建構系統**，不是要 Claude 直接代寫。遇到變更需求時，優先解釋原理、給出步驟，讓使用者自己動手改，除非使用者明確要求直接修改。
- 解釋時要說明「為什麼」（why），不只是「怎麼做」（how）。
- 正式環境的網域/憑證等細節（HTTPS、真實網域名稱）仍待規劃；但「用反向代理做同源部署」這件事本身**已經是現況**（Caddy），不是尚未動工的未來規劃。

## 現況補充

- 有 git（`.git` 存在）
- 沒有 lint 設定檔
- `package.json` 只有 vite + jest/babel 相關 devDependencies，沒有任何 UI 框架或 axios 等第三方套件
