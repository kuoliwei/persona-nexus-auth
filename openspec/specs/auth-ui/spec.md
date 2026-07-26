# auth-ui Specification

> 本檔是 persona-nexus-auth **當前實際行為**的規格（as-is），逐條對照原始碼撰寫，不做美化、不寫理想版。
> 已納入 change `simplify-auth-ui` 的優化結果（新增 `api.js`、簡化 `config-loader.js` 為僅探測
> 可達性、改用相對路徑、`messageBox` 加上 `aria-live`、修復壞掉的單元測試、刪除鷹架死檔案）。
> 最後對照時間：與 `src/`、`index.html`、`vite.config.js` 現況一致。

## Purpose

persona-nexus-auth 是 Persona Nexus 平台的**登入/註冊頁**，多頁前端架構中的其中一頁。
只負責提供註冊、登入的表單 UI，呼叫 api-gateway 完成帳號建立與身分驗證，並在登入成功後
把使用者導向大廳（persona-nexus-lobby）。本專案**不持有**任何使用者資料或 session 狀態
（token 的儲存發生在 lobby 端，不在本專案）。

### 當前架構圖（as-is）

```
瀏覽器
  │
  ▼
http://localhost:8080（Caddy 反向代理，同源入口）
  ├─ /login/*  ──▶ 本專案 Vite dev server (5173)
  │                    │
  │        index.html（單頁，含 registerForm + loginForm + tab 切換按鈕）
  │                    │
  │        src/main.js（監聽 submit/click 事件，直接操作 DOM；init() 內先探測後端可達性）
  │           │
  │           ├─▶ src/config-loader.js ──GET /api/config──▶ api-gateway（只探測可達性，不解析回應）
  │           │
  │           └─▶ src/api.js
  │                  ├─▶ POST /api/auth/register
  │                  └─▶ POST /api/auth/login
  │
  └─ /api/*   ──▶ api-gateway (8000) ──▶ auth-service (3000)
```

`/api/auth/*`、登入成功後導向的 `/` 皆為寫死的相對路徑常數，經 Caddy 同源代理轉發，
不再透過 `/api/config` 動態組裝絕對網址（見 change `simplify-auth-ui`）。

## Requirements

### Requirement: 頁面初始化與設定載入
系統 SHALL 在 `main.js` 載入時透過 `config-loader.js` 的 `loadConfig()` 探測 api-gateway
是否可達（`fetch('/api/config')`，只檢查 `response.ok`，不解析或快取回應內容）。
若探測失敗，系統 MUST 顯示連線失敗訊息，且 MUST 阻止後續的註冊/登入請求送出。
系統 SHALL NOT 向 `/api/config` 索取 `services.gateway`／`frontends.lobby` 等網址資料——
註冊、登入、導向所需的路徑改為寫死的相對路徑常數（見下方「使用者註冊」「使用者登入與導向大廳」）。

#### Scenario: 探測成功
- **WHEN** `loadConfig()` 對 `/api/config` 的 `fetch()` 回應 `response.ok` 為 `true`
- **THEN** `init()` 繼續執行，`configLoadError` 保持 `false`，兩個表單的 submit handler 正常運作

#### Scenario: 探測失敗
- **WHEN** `loadConfig()` 的 `fetch()` 拋出例外，或回應 `response.ok` 為 `false`
- **THEN** 系統設定 `configLoadError = true`，在 `messageBox` 顯示「❌ 無法連線至服務器，請稍後重試。」並加上 `error` class

#### Scenario: 探測失敗後仍嘗試送出表單
- **WHEN** `configLoadError` 為 `true`，使用者仍點擊註冊或登入的送出按鈕
- **THEN** submit handler 立即顯示同樣的連線失敗訊息並 `return`，不呼叫 `api.js` 的 `register()`/`login()`

### Requirement: 表單頁籤切換
系統 SHALL 提供註冊、登入兩個表單，透過 tab 按鈕互斥顯示；切換時 MUST 清除當前顯示中的訊息框內容。

#### Scenario: 切到登入頁籤
- **WHEN** 使用者點擊 `tabLogin`
- **THEN** `tabLogin` 加上 `active` class、`tabRegister` 移除、`loginForm` 顯示、`registerForm` 隱藏，`messageBox` 文字與 `success`/`error` class 一併清除

#### Scenario: 切到註冊頁籤
- **WHEN** 使用者點擊 `tabRegister`
- **THEN** 行為對稱：`registerForm` 顯示、`loginForm` 隱藏，`messageBox` 同樣被清除

### Requirement: 使用者註冊
系統 SHALL 在使用者送出註冊表單時，透過 `src/api.js` 的 `register(email, password)` 呼叫
`POST /api/auth/register`（相對路徑常數，經 Caddy 同源代理轉發至 api-gateway）。
送出期間 MUST 停用送出按鈕並顯示處理中文字，無論成功或失敗 MUST 在請求結束後還原按鈕狀態。

#### Scenario: 註冊成功
- **WHEN** `registerForm` 送出，`api.js` 的 `register()` 回傳 `ok: true`
- **THEN** 顯示成功訊息（含後端回傳的 `result.id`）、`registerForm.reset()`；**不會**自動登入或導向任何頁面

#### Scenario: 註冊失敗（後端拒絕）
- **WHEN** `register()` 回傳 `ok: false`
- **THEN** 顯示 `❌ 註冊失敗：${result.message || '伺服器錯誤'}`，表單內容保留（未 reset）

#### Scenario: 註冊時網路層錯誤
- **WHEN** `register()` 內部 `fetch()` 拋出例外（斷線、CORS 阻擋等）
- **THEN** 顯示固定文案「❌ 無法連線至服務器，請稍後重試。」，不暴露例外細節給使用者

### Requirement: 使用者登入與導向大廳
系統 SHALL 在使用者送出登入表單時，透過 `src/api.js` 的 `login(email, password)` 呼叫
`POST /api/auth/login`（相對路徑常數）。登入成功時系統 MUST 將回應中的 `token` 附加於導向
大廳的相對路徑（`/`）query string 上，並在短暫延遲後執行導向；系統 MUST NOT 在本專案內把
token 寫入 `localStorage`（該職責屬於接收方 lobby，見下方 Non-goals）。

#### Scenario: 登入成功並導向
- **WHEN** `loginForm` 送出，`login()` 回傳 `ok: true`
- **THEN** 顯示成功訊息（含 `result.id`）、`loginForm.reset()`，並以 `setTimeout` 延遲 1500ms 後執行 `window.location.href = \`/?token=${encodeURIComponent(result.token)}\``

#### Scenario: 登入失敗（帳密錯誤）
- **WHEN** `login()` 回傳 `ok: false`
- **THEN** 顯示 `❌ 登入失敗：${result.message || '伺服器錯誤'}`，**不**執行任何導向

#### Scenario: 登入時網路層錯誤
- **WHEN** `login()` 內部 `fetch()` 拋出例外
- **THEN** 顯示固定文案「❌ 無法連線至服務器，請稍後重試。」

### Requirement: 表單原生驗證
兩個表單的 email 與密碼欄位 SHALL 使用原生 HTML 屬性（`type="email"`、`required`）做第一層驗證，
瀏覽器會在觸發 `submit` 事件前先行攔截明顯不合法的輸入（空值、非 email 格式）。

#### Scenario: 必填欄位留空
- **WHEN** 使用者未填寫 email 或密碼即點擊送出按鈕
- **THEN** 瀏覽器原生驗證攔截，不觸發 `submit` 事件、`main.js` 的 handler 不會執行

### Requirement: 訊息框可及性
`messageBox` SHALL 具備 `role="status"` 與 `aria-live="polite"`，使輔助科技（螢幕報讀器）
能在訊息內容變更時主動朗讀，不需仰賴使用者主動尋找畫面上的視覺提示。

#### Scenario: 螢幕報讀器朗讀動態訊息
- **WHEN** `showMessage()` 更新 `messageBox` 的文字內容（無論成功或失敗）
- **THEN** 具備 `aria-live="polite"` 的容器使螢幕報讀器在使用者當前操作空檔朗讀新內容

## Non-goals（刻意不在本專案範圍內的行為）

- **token 的持久化儲存**：本專案只負責把 token 帶到 URL 交給下一頁，實際寫入 `localStorage`
  是 `persona-nexus-lobby/src/main.js` 的職責，不在本專案規格內。
- **登入後自動導向的可設定性**：導向目標路徑（`LOBBY_PATH`，寫死為 `'/'`）與延遲時間（1500ms）
  目前皆為寫死常數，非使用者可調整項。
- **`persona-nexus-character` 的 `config-loader.js` 重複問題**：獨立 git repo，留待該服務自己
  的稽核輪次處理，不在本專案規格範圍內。
