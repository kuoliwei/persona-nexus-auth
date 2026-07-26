# Tasks — simplify-auth-ui

## 行為變更（風險較高，先做、先隔離）

- [ ] T1. 簡化 `src/config-loader.js`：移除 `getConfig()` 與整包 config 快取，`loadConfig()`
      改為只探測 `/api/config` 可達性（比照 `persona-nexus-lobby` 現行模式）
- [ ] T2. 新增 `src/api.js`：`register(email, password)`、`login(email, password)`，內含相對路徑
      常數 `/api/auth/register`、`/api/auth/login` 與共用的 `postCredentials()` 輔助函式
- [ ] T3. 改寫 `src/main.js`：
  - [ ] T3.1 移除 `getConfig` import 與 `BACKEND_REGISTER_URL`/`BACKEND_LOGIN_URL`/`LOBBY_APP_URL`
        三個從 config 組出的變數
  - [ ] T3.2 把原本 top-level 的 `await loadConfig()` 與後續接線邏輯包進 `async function init()`，
        底部呼叫 `init()`
  - [ ] T3.3 兩個表單的 submit handler 改呼叫 `api.js` 的 `register()`/`login()`，取代直接 `fetch()`
  - [ ] T3.4 登入成功導向改用寫死常數 `window.location.href = \`/?token=...\``
- [ ] T4. `index.html` 的 `#messageBox` 加上 `role="status" aria-live="polite"`

## 行為不變（清理與修復，後做）

- [ ] T5. 刪除死檔案：`src/counter.js`、`src/javascript.svg`、`src/vite.svg`、`src/hero.png`、
      `src/style copy.css`
- [ ] T6. 修復 `src/main.test.js`：
  - [ ] T6.1 移除 `eval(fs.readFileSync(...))`，改用 `jest.resetModules()` + `require('./main.js')`
  - [ ] T6.2 補上對 `/api/config` 探測請求的 `fetch` mock（需與註冊/登入請求的 mock 分開判斷，
        依呼叫順序或 URL 區分）
  - [ ] T6.3 確認原本兩個情境（送出後按鈕 disable + 顯示載入文字）依然通過

## 驗證

- [ ] T7. `npx jest` 全數通過
- [ ] T8. `npm run build` 正常、`dist/` 內容檢查（確認死檔案刪除後不影響 build）
- [ ] T9. 手動以瀏覽器走過：註冊成功／失敗、登入成功（觀察導向與 URL）、登入失敗、
      `/api/config` 無回應時的錯誤畫面、`messageBox` 的 `aria-live` 屬性存在於 DOM

## 回寫規格

- [ ] T10. 把本 change 的 delta 同步進 `openspec/specs/auth-ui/spec.md`
- [ ] T11. 更新 `CLAUDE.md`（現況、測試狀態、演進歷史加一筆）
- [ ] T12. 在 `mistake.md` 標記各項已處理
