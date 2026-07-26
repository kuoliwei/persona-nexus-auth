# auth-ui (delta) — auth-ui-foundation

> **凍結的地基快照**：這份 delta 記錄「persona-nexus-auth 當初新增了哪些能力」，內容對應 main spec
> `openspec/specs/auth-ui/spec.md` 在地基階段的狀態。它是 provenance（來歷），**不隨後續優化更動**；
> 系統之後的演進請改 main spec，勿改這裡。本次是本專案第一輪 openspec 記錄，尚未經過任何優化 change，
> 因此本檔內容與 main spec 完全一致。

## ADDED Requirements

### Requirement: 頁面初始化與設定載入
系統 SHALL 在 `main.js` 載入時立即向 `/api/config` 取得執行期設定（gateway 網址、lobby 網址）。
若設定載入失敗，系統 MUST 顯示連線失敗訊息，且 MUST 阻止後續的註冊/登入請求送出。

#### Scenario: 設定載入成功
- **WHEN** `loadConfig()` 成功取得 `/api/config` 回應
- **THEN** `BACKEND_REGISTER_URL`、`BACKEND_LOGIN_URL`、`LOBBY_APP_URL` 三個變數依回應內容組出（`{gateway}/auth/register`、`{gateway}/auth/login`、`{frontends.lobby}`），`configLoadError` 保持 `false`

#### Scenario: 設定載入失敗
- **WHEN** `loadConfig()` 拋出例外（例如 `/api/config` 無回應）
- **THEN** 系統設定 `configLoadError = true`，在 `messageBox` 顯示「❌ 無法連線至服務器，請稍後重試。」並加上 `error` class；三個 URL 變數皆為 `null`

#### Scenario: 設定載入失敗後仍嘗試送出表單
- **WHEN** `configLoadError` 為 `true`，使用者仍點擊註冊或登入的送出按鈕
- **THEN** submit handler 立即顯示同樣的連線失敗訊息並 `return`，不呼叫 `fetch()`

### Requirement: 表單頁籤切換
系統 SHALL 提供註冊、登入兩個表單，透過 tab 按鈕互斥顯示；切換時 MUST 清除當前顯示中的訊息框內容。

#### Scenario: 切到登入頁籤
- **WHEN** 使用者點擊 `tabLogin`
- **THEN** `tabLogin` 加上 `active` class、`tabRegister` 移除、`loginForm` 顯示、`registerForm` 隱藏，`messageBox` 文字與 `success`/`error` class 一併清除

#### Scenario: 切到註冊頁籤
- **WHEN** 使用者點擊 `tabRegister`
- **THEN** 行為對稱：`registerForm` 顯示、`loginForm` 隱藏，`messageBox` 同樣被清除

### Requirement: 使用者註冊
系統 SHALL 在使用者送出註冊表單時，以 email 與密碼呼叫 `POST {gateway}/auth/register`。
送出期間 MUST 停用送出按鈕並顯示處理中文字，無論成功或失敗 MUST 在請求結束後還原按鈕狀態。

#### Scenario: 註冊成功
- **WHEN** `registerForm` 送出，`fetch()` 回應 `response.ok` 為 `true`
- **THEN** 顯示成功訊息（含後端回傳的 `result.id`）、`registerForm.reset()`；**不會**自動登入或導向任何頁面

#### Scenario: 註冊失敗（後端拒絕）
- **WHEN** `fetch()` 回應 `response.ok` 為 `false`
- **THEN** 顯示 `❌ 註冊失敗：${result.message || '伺服器錯誤'}`，表單內容保留（未 reset）

#### Scenario: 註冊時網路層錯誤
- **WHEN** `fetch()` 本身拋出例外（斷線、CORS 阻擋等）
- **THEN** 顯示固定文案「❌ 無法連線至服務器，請稍後重試。」，不暴露例外細節給使用者

### Requirement: 使用者登入與導向大廳
系統 SHALL 在使用者送出登入表單時，以 email 與密碼呼叫 `POST {gateway}/auth/login`。
登入成功時系統 MUST 將回應中的 `token` 附加於導向大廳網址的 query string 上，並在短暫延遲後執行導向；
系統 MUST NOT 在本專案內把 token 寫入 `localStorage`（該職責屬於接收方 lobby，見 proposal.md 的 Non-goals）。

#### Scenario: 登入成功並導向
- **WHEN** `loginForm` 送出，`fetch()` 回應 `response.ok` 為 `true`
- **THEN** 顯示成功訊息（含 `result.id`）、`loginForm.reset()`，並以 `setTimeout` 延遲 1500ms 後執行 `window.location.href = \`${LOBBY_APP_URL}/?token=${encodeURIComponent(result.token)}\``

#### Scenario: 登入失敗（帳密錯誤）
- **WHEN** `fetch()` 回應 `response.ok` 為 `false`
- **THEN** 顯示 `❌ 登入失敗：${result.message || '伺服器錯誤'}`，**不**執行任何導向

#### Scenario: 登入時網路層錯誤
- **WHEN** `fetch()` 本身拋出例外
- **THEN** 顯示固定文案「❌ 無法連線至服務器，請稍後重試。」

### Requirement: 表單原生驗證
兩個表單的 email 與密碼欄位 SHALL 使用原生 HTML 屬性（`type="email"`、`required`）做第一層驗證，
瀏覽器會在觸發 `submit` 事件前先行攔截明顯不合法的輸入（空值、非 email 格式）。

#### Scenario: 必填欄位留空
- **WHEN** 使用者未填寫 email 或密碼即點擊送出按鈕
- **THEN** 瀏覽器原生驗證攔截，不觸發 `submit` 事件、`main.js` 的 handler 不會執行
