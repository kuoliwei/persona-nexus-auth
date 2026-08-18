## Context

`persona-nexus-auth` 與 `persona-nexus-lobby` 是兩個獨立部署的前端（各自 Vite dev server），
透過 Caddy 反向代理收斂到同一個 origin（`http://localhost:8080`，`deploy/Caddyfile:32-73`）。
`localStorage` 的隔離邊界是 origin（協定+網域+port），不是 Vite dev server 的裸 port，所以
兩者的 `localStorage` 本來就共享。現在的「網址帶 token」做法，是同源部署導入前（auth 與
lobby 各自獨立 port，真正跨源）留下的機制，同源部署上線後沒人回頭檢討這條路徑是否還有必要
——`auth-ui/spec.md` 與 `lobby-ui/spec.md`（lobby repo）都只記錄「這條路徑目前是通的」，
沒有質疑它是否還需要。

## Goals / Non-Goals

**Goals:**
1. 登入成功後，token 直接由 auth 寫入 `localStorage`，不再繞道網址
2. 維持現有 1500ms 延遲與訊息顯示時序不變（刻意的 UX，不在本輪討論範圍）
3. 不改變 token 內容、效期、存放方案（`localStorage`）

**Non-Goals:**
1. 不處理 `localStorage` vs `httpOnly` cookie 的資安取捨（已與使用者完整討論 XSS/CSRF
   威脅模型、`SameSite`/CSP 緩解手段、登出邏輯改動代價，結論是維持現況，另找時間專門評估，
   見下方「延伸待辦」）
2. 不處理 lobby→character/chat/rpg-scene 的 iframe token 傳遞方式（獨立的既有落差，
   `lobby/openspec/changes/character-postmessage-listener/design.md` 已記錄為「另一輪待辦」，
   本次不是那一輪）
3. 不處理 token 生命週期重新設計（access/refresh 雙層、revoke 機制）——現況為單層 7 天 token
   （`auth-service/src/utils/jwtHelper.js:5-9`），本輪不動

## Decisions

### 1. 新增獨立檔案 `session.js`，只放 `setToken()`

**決策：** 不 inline 寫進 `main.js`，也不塞進 `api.js`。

**理由：** `api.js`（`auth/src/api.js`）目前是純網路層（只有 `register`/`login` 兩個 fetch
封裝），混入 storage 邏輯會弄髒職責邊界。獨立檔案雖然只有一個函式，但比照
`persona-nexus-chat` 的 `session.js` 慣例（`chat/src/session.js`），對後續可能的統一工作是
一個清楚的參考點。auth 不需要 `getToken()`（它自己從不讀 token），所以只放 `setToken()`，
不比照 lobby/chat 那樣是完整的 get/set/clear 三件套——YAGNI。

### 2. token 寫入時機：留在 `setTimeout` 回呼內，不提前

**決策：** `setToken()` 呼叫緊接在 `window.location.href = LOBBY_PATH` 之前，兩者都在原有的
`setTimeout(..., 1500)` 回呼裡執行，不把 `setToken()` 提到 `setTimeout` 外面立即執行。

**理由：** 提前寫入會讓「顯示登入成功訊息」與「token 已持久化」出現 1.5 秒的時序落差
（使用者若在這段時間內關閉分頁，行為會從「這次登入沒發生過」變成「已登入」）。這是一個沒人
要求的行為改變，本輪目標是換傳遞機制，不是換時序語意。

### 3. 網址不再帶任何 query string

**決策：** `window.location.href = LOBBY_PATH`（即 `/`），不做任何參數拼接。

**理由：** token 已經在同一個回呼內寫入 `localStorage`，lobby 端不再需要從網址讀取任何東西。

## Risks / Trade-offs

| 風險 | 影響 | 緩解方案 |
|------|------|--------|
| lobby 端的消費邏輯若未同步移除或未同步部署 | lobby 的 `main.js` 仍會嘗試讀取（已經恆為 null 的）`?token=` 參數，程式碼上不會出錯（`if (tokenFromUrl)` 判斷為 false 直接跳過），但會留下死碼 | 已在 `auth-token-handoff-cleanup`（lobby repo）同步處理；即使兩邊部署時間有落差，行為不會壞掉，只是暫時有死碼 |
| `localStorage` 寫入失敗（無痕模式配額限制、瀏覽器封鎖 storage） | 使用者會看到「登入成功」訊息但實際上 token 未寫入，下一步進 lobby 會被判定未登入 | 不在本輪處理（YAGNI）：平台其他三個前端的 `setToken()` 呼叫點同樣沒有防護，單獨在這裡加會製造新的不一致，已與使用者確認此為刻意範圍排除 |

## 延伸待辦（不在本輪，留供未來接續）

- **`localStorage` vs `httpOnly` cookie**：今天已完整討論 XSS/CSRF 威脅模型、`SameSite`/CSP
  緩解手段、登出邏輯改動代價、本機開發 HTTPS 前提。結論：同源部署已避開 cookie 方案在跨網域
  場景的主要複雜度（不需要 `SameSite=None`、不需要跨網域 cookie scope 設定），但決定維持
  現況，另找時間專門評估（需要拉 `auth-service`、`api-gateway`、五個前端一起討論）
- **token 生命週期**（7 天單層、無 refresh、無 revoke）的重新設計：若未來要做 `httpOnly`
  cookie 遷移，這塊需要一併重新設計，現況的「登出」只是前端清 `localStorage`，token 本身在
  7 天內仍然有效，沒有伺服器端撤銷機制
- **lobby→character/chat 的 iframe token 傳遞方式跟進 rpg-scene 模式**：`character/src/create.js:31-36`、
  `chat/src/main.js:13-20` 仍從網址讀 token，`persona-nexus-rpg-scene/src/api.js:5-7` 已是
  驗證過的示範實作，character/chat 可直接抄，但這是另一輪、且機制與本次（整頁導航 vs iframe
  崁入）不同類，不能混為一談
