# Design — simplify-auth-ui

> 記錄本次優化改動後的結構，前後對照。

## 變更前 / 變更後架構對照

**變更前：**
```
main.js（單一檔案，身兼多重角色）
  ├─ DOM 接線
  ├─ import { loadConfig, getConfig } from config-loader.js
  ├─ top-level await loadConfig()
  ├─ 組 BACKEND_REGISTER_URL / BACKEND_LOGIN_URL / LOBBY_APP_URL（讀 config 的絕對網址）
  ├─ 表單 submit handler 內直接 fetch(BACKEND_REGISTER_URL / BACKEND_LOGIN_URL)
  └─ 登入成功 → window.location.href = `${LOBBY_APP_URL}/?token=...`

config-loader.js
  └─ loadConfig() 打 /api/config，快取整包 { services, frontends }；getConfig() 取出快取
```

**變更後：**
```
main.js
  ├─ DOM 接線（不變）
  ├─ import { loadConfig } from config-loader.js
  ├─ import { register, login } from api.js
  ├─ async function init() { ... }（把原本 top-level await 的邏輯包進來）
  ├─ 表單 submit handler 呼叫 register(email, password) / login(email, password)
  └─ 登入成功 → window.location.href = `/?token=...`（LOBBY_PATH 常數）

api.js（新增）
  ├─ const REGISTER_URL = '/api/auth/register'
  ├─ const LOGIN_URL = '/api/auth/login'
  ├─ async function postCredentials(url, email, password) → { ok, status, result }
  ├─ export function register(email, password)
  └─ export function login(email, password)

config-loader.js（簡化，比照 persona-nexus-lobby 的現行模式）
  └─ loadConfig()：只 fetch('/api/config') 探測可達性，response.ok 為 false 時 throw；
     不再回傳或快取任何資料，移除 getConfig()
```

## 為什麼登入/註冊 URL 可以安全改成寫死的相對路徑

`persona-nexus-auth` 只透過 Caddy（`localhost:8080`）同源存取（`vite.config.js` 的
`base:'/login/'` 已是此前提），而 Caddy 把 `/api/*` 轉發到 api-gateway。也就是說，
不論頁面用「向 `/api/config` 要 `services.gateway` 再組網址」或「直接寫 `/api/auth/register`」，
瀏覽器最終發出的請求都是同一個 origin 下的同一條路徑。`persona-nexus-lobby` 已經先一步驗證
這個簡化是安全的（`LOGIN_APP_URL = '/login'` 的先例）。

## `main.js` 的 init() 重構動機

原本的 top-level `await loadConfig()` 是 ES module 語法，只在真正的模組載入（瀏覽器 `<script
type="module">`、或測試裡用真正的 `import`/`require`）下才合法。舊測試用 `eval(fs.readFileSync
(...))` 把原始碼當純字串執行——這不是模組執行環境，`import` 陳述式與 top-level `await` 都不被
允許。把邏輯包進 `async function init() { ... }; init();` 後，模組本身在語法上只是「宣告一個
函式並呼叫它」，不依賴 top-level await，可以被 Babel 正常轉譯成 CommonJS 給 Jest 的
`require()` 使用。

## 測試載入方式變更

`main.test.js` 改用 `jest.resetModules()` + `require('./main.js')`：
- `resetModules()` 清空 Jest 的模組快取，確保每個 `test` 都拿到「重新執行一次模組頂層程式碼」
  的乾淨狀態（對應原本 `eval()` 每次都重新執行一次字串的效果）。
- 因為 `init()` 內部會 `await loadConfig()`（發一次 `fetch('/api/config')`），測試的 `fetch`
  mock 需要能分辨「這是 config 探測請求」還是「這是註冊/登入請求」——按呼叫順序或按 URL 判斷。

## 可及性：`messageBox` 的 `aria-live`

新增 `role="status" aria-live="polite"`（不用 `assertive`，因為訊息不是緊急告警，`polite`
足以讓螢幕報讀器在使用者當前操作空檔朗讀，不會打斷正在進行的輸入）。純屬性新增，不影響現有
CSS 選擇器（`.message-box.success`／`.message-box.error` 皆不受影響）。
