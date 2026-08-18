# Tasks — direct-token-storage

所有 diff 皆已對照 `src/main.js`、`src/api.js` 現行內容逐行核對（2026-08-12），行號為變更前的原始行號。

## 行為變更

- [x] T1. 新增 `src/session.js`（全新檔案）：

  ```js
  export function setToken(token) {
    localStorage.setItem('token', token);
  }
  ```

- [x] T2. `src/main.js` 第 29-30 行，新增 import（不動原本兩行，插在其後）：

  **修改前：**
  ```js
  import { loadConfig } from './config-loader.js';
  import { register, login } from './api.js';
  ```

  **修改後：**
  ```js
  import { loadConfig } from './config-loader.js';
  import { register, login } from './api.js';
  import { setToken } from './session.js';
  ```

- [x] T3. `src/main.js` 第 161-169 行，登入成功分支：

  **修改前：**
  ```js
        if (ok) {
          console.log('🎉 [結果] 後台判定成功 (HTTP 200)！');
          showMessage('success', `🎉 帳號登入成功！歡迎，您的 ID 為：${result.id}`);
          loginForm.reset();
          const token = result.token;
          setTimeout(() => {
            window.location.href = `${LOBBY_PATH}?token=${encodeURIComponent(token)}`;
          }, 1500);
        } else {
  ```

  **修改後：**
  ```js
        if (ok) {
          console.log('🎉 [結果] 後台判定成功 (HTTP 200)！');
          showMessage('success', `🎉 帳號登入成功！歡迎，您的 ID 為：${result.id}`);
          loginForm.reset();
          const token = result.token;
          setTimeout(() => {
            setToken(token);
            window.location.href = LOBBY_PATH;
          }, 1500);
        } else {
  ```

  （`LOBBY_PATH` 常數本身不動，仍是第 33 行 `const LOBBY_PATH = '/';`，只是原本的
  template-literal 拼接改為直接賦值；`encodeURIComponent` 一併移除，因為 token 不再進入
  URL，不需要 URL-safe 編碼）

## 測試（實作前先與使用者討論測試作法，不預設具體斷言）

- [x] T4. 確認 `src/main.test.js` 既有 2 個測試（按鈕 disable/載入文字）不受影響、仍然通過——
      `npx jest` 實測 2/2 通過
- [x] T5. 與使用者討論後決定：不新增 Jest 單元測試，改用 Playwright 端到端驗證（見 T8），
      直接比對「auth 簽發的 token」「lobby localStorage 內的 token」「lobby 打 API 用的
      token」三處字串是否一致，涵蓋範圍比單元測試更貼近實際行為

## 驗證

- [x] T6. `npx jest` 全數通過（2/2）
- [x] T7. `npm run build` 正常（8 模組，含新增的 session.js）
- [x] T8. 手動瀏覽器走查——實際以 Playwright 對真實服務（Caddy + 五個前端 + api-gateway +
      auth-service，使用者已啟動）跑自動化腳本：登入成功後 `localStorage.getItem('token')`
      與登入 API 回應的 token **逐字元相等**、網址列不含 `?token=`、1.5 秒後正確導向大廳且
      lobby 打受保護 API 時的 `Authorization` header 與同一個 token 一致
- [x] T9. 登入失敗、網路層錯誤兩種情境下 `localStorage` 未被寫入——Playwright 腳本補測：
      (A) 帳密錯誤（`login()` 回傳 `ok:false`）：`localStorage.getItem('token')` 為 `null`，
      頁面停留在登入頁；(B) 網路層錯誤（`page.route` 直接 abort 登入 API 請求，模擬 `fetch()`
      拋例外，走 `main.js` 的 `catch(error)` 分支，實測畫面確實顯示「❌ 無法連線至服務器，
      請稍後重試。」）：`localStorage.getItem('token')` 同樣為 `null`

## 回寫規格

- [x] T10. 把本 change 的 delta 同步進 `openspec/specs/auth-ui/spec.md`，並移除 Non-goals
       段落中「token 的持久化儲存⋯不在本專案規格內」該條；`npx openspec validate --all --strict`
       通過
- [x] T11. 更新 `CLAUDE.md`（登入流程段落、演進歷史加一筆）
