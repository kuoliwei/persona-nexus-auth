# auth-ui (delta) — direct-token-storage

## MODIFIED Requirements

### Requirement: 使用者登入與導向大廳
系統 SHALL 在使用者送出登入表單時，透過 `src/api.js` 的 `login(email, password)` 呼叫
`POST /api/auth/login`（相對路徑常數）。登入成功時系統 MUST 呼叫 `src/session.js` 的
`setToken(result.token)` 將 token 寫入 `localStorage`，並在短暫延遲後導向大廳（`/`，
不帶任何 query string）。

#### Scenario: 登入成功並導向
- **WHEN** `loginForm` 送出，`login()` 回傳 `ok: true`
- **THEN** 顯示成功訊息（含 `result.id`）、`loginForm.reset()`，並以 `setTimeout` 延遲
  1500ms 後，在同一個回呼內依序執行 `setToken(result.token)` 與 `window.location.href = '/'`

#### Scenario: 登入失敗（帳密錯誤）
- **WHEN** `login()` 回傳 `ok: false`
- **THEN** 顯示 `❌ 登入失敗：${result.message || '伺服器錯誤'}`，**不**執行任何導向，
  **不**呼叫 `setToken()`

#### Scenario: 登入時網路層錯誤
- **WHEN** `login()` 內部 `fetch()` 拋出例外
- **THEN** 顯示固定文案「❌ 無法連線至服務器，請稍後重試。」，**不**呼叫 `setToken()`
