# persona-nexus-auth 設計稽核記錄（mistake.md）

> **這是什麼**：拿平台的《前端系統設計原則》逐條對照 persona-nexus-auth 的現況（依據 openspec 的
> `changes/auth-ui-foundation/proposal.md`、`design.md` 與 `specs/auth-ui/spec.md`），
> 找出不符原則之處。
>
> **原則**：符合的也如實標出，不硬湊違反；每項標示把握程度（高/中/低）。
> **用途**：作為後續「優化 change」的依據——每個確認的違反點，會轉成一筆規格變更來驅動修正。
> **稽核時間**：2026-07-26。實際跑過 `npx jest` 與 `npm run build` 驗證，非僅憑讀碼推測。

---

## A. 通用軟體設計原則

| 原則 | 判定 | 依據 |
|------|------|------|
| KISS | 大致符合 | `main.js` 邏輯直觀（DOM 接線→事件監聽→fetch→回饋），唯一稍增認知負擔的是大量表情符號 debug `console.log`（非邏輯複雜度問題，見文末誠實提醒） |
| DRY | ❌ **違反（中把握，跨服務）** | `src/config-loader.js` 與 `persona-nexus-character/src/config-loader.js` 幾乎逐字重複（僅一行 port 註解不同）——同一套「如何取得執行期設定」的知識在平台內有兩份副本 |
| YAGNI | ❌ **違反（高把握）** | `src/counter.js`、`src/javascript.svg`、`src/vite.svg`、`src/hero.png`、`src/style copy.css` 皆為 Vite 鷹架殘留，未被 `index.html` 或任何模組引用（已用 `npm run build` 驗證：`dist/` 只有 3 個檔案，這些死檔案本來就不會進正式產物，純粹是原始碼庫裡的死重量） |
| SSOT | ⚠️ **部分違反（中把握，跨服務，屬架構方向議題）** | `persona-nexus-lobby/src/config-loader.js` 已改寫成「同源部署後不再需要從後端取得其他前端網址，只用來探測後端可達性」，其 `main.js` 直接把 `LOGIN_APP_URL` 寫死為相對路徑常數 `'/login'`；但本專案仍在用舊模式——向 `/api/config` 要 `frontends.lobby`、`services.gateway` 組出絕對網址。平台內同一件事（前端如何取得「另一個前端/後端的網址」）存在新舊兩種做法，且新做法出自作者自己對舊做法「已不需要」的判斷 |

## B. 前端架構與模組化原則

| 原則 | 判定 | 依據 |
|------|------|------|
| 關注點分離 SoC | ⚠️ **部分違反（中把握）** | `main.js` 單一檔案身兼 DOM 接線、config 載入、表單驗證觸發、API 呼叫、UI 回饋（`showMessage`）多重角色，無模組邊界 |
| 漸進增強 | ✅ 符合 | 兩個表單的 email/password 欄位皆有 `type="email"`、`required`，瀏覽器原生驗證先行攔截明顯錯誤輸入 |
| 最低能力原則 | ✅ 符合 | 未見以 JS 重造瀏覽器原生就有的能力 |
| 模組邊界／資訊隱藏 | ✅ 符合 | `config-loader.js` 用 `export`/`import`，內部快取變數 `config` 不外流，只透過 `loadConfig()`/`getConfig()` 兩個函式對外 |
| API 層與 UI 層分離 | ❌ **違反（高把握）** | 兩支 `fetch()` 呼叫（register/login）直接寫在對應 `<form>` 的 `submit` 事件處理函式內，沒有獨立的 API 模組；同平台的 `persona-nexus-lobby`、`persona-nexus-chat` 都有專責的 `src/api.js` |
| 狀態管理單一入口 | 不適用 | 本專案不持有任何跨頁狀態（token 的儲存是 `persona-nexus-lobby` 的職責），沒有違反此條的空間 |

## C. 效能與資源管理

| 原則 | 判定 | 依據 |
|------|------|------|
| Core Web Vitals | ✅ 符合 | 頁面內容極輕量，無阻塞性大型資源；唯一的圖片 `hero.png` 未被引用，不影響渲染 |
| Bundle Hygiene | ✅ **符合（已用 `npm run build` 實測驗證，非僅推測）** | `dist/` 只有 `index.html` + 1 個 css + 1 個 js（共 5 個 modules transformed），YAGNI 那組死檔案因為從未被 `import`，Vite 的 module graph 本來就不會把它們收進正式產物——這點在最初讀碼時容易誤判成「Bundle Hygiene 違反」，但實測後確認**不成立**，問題純粹在 YAGNI（原始碼庫的死重量），不重複計入本項 |
| 資源快取與版本化 | ✅ 符合（已實測） | build 產物檔名為 `index-DbNi_iB3.js`、`index-MNlOCWcA.css`，確認 Vite 預設的 content hash 機制生效，無繞過建置管線的證據 |
| 環境設定外部化 | ✅ 符合 | API 網址透過 `/api/config` 執行期取得，未寫死在程式碼裡（但如上方 SSOT 一項所述，這整套機制本身是否還有存在必要，是另一層次、待裁示的問題） |

## D. 可及性與使用者體驗一致性

| 原則 | 判定 | 依據 |
|------|------|------|
| WCAG | ⚠️ **部分違反（中把握）** | 表單欄位皆有正確 `<label for="...">` 關聯（值得肯定）；但 `messageBox` 動態內容變化（登入/註冊成功或失敗訊息）沒有 `aria-live` 屬性，螢幕報讀器使用者不會被主動告知結果，對應 WCAG 2.1 SC 4.1.3（Status Messages） |
| 一致性與標準 | 資訊不足，未判定 | 未逐一比對其他三個前端的錯誤訊息框／按鈕載入文案風格是否一致，超出本輪單一服務稽核範圍 |
| 錯誤預防與明確回饋 | ✅ 符合（值得肯定） | 錯誤訊息已在既有提交（`e07d29b fix: remove sensitive error information from user-facing messages`）中移除內部技術細節；註冊失敗時保留表單內容，方便使用者修正重試 |

---

## 額外發現：非設計原則類、但屬實際壞掉的功能性缺陷

| 項目 | 事實 | 把握 |
|------|------|------|
| **單元測試目前 0/2 全部失敗** | 實跑 `npx jest`：兩個測試皆拋 `SyntaxError: Cannot use import statement outside a module`。原因是 `main.js` 為載入 `config-loader.js` 加了 `import` 陳述式，但 `main.test.js` 用 `eval(fs.readFileSync(...))` 把原始碼當字串執行，`eval` 不經過 Babel 轉譯、無法處理 ES module 語法。這是 config 機制導入後遺留、從未被發現的**真壞測試**，不是「涵蓋不足」而已 | 高（已實跑驗證） |

---

## 稽核結論：確認的候選違反點（按把握度排序）

> **處理狀態**：使用者核對後決定第 1–4、6、7 項納入本輪處理，第 5 項（跨服務架構方向）原本
> 提出疑問，後確認也一併處理；唯獨第 4 項的「與 `persona-nexus-character` 消除重複」實際上
> 需要改兩個獨立 repo 才能真正做到 DRY，本輪範圍界定為：`persona-nexus-auth` 這邊改採
> `persona-nexus-lobby` 已驗證的新模式（新的重複對象換成 lobby，但代表正確方向），
> `persona-nexus-character` 那份维持舊版本、留待該服務自己的稽核輪次處理。
> 全部已由 change `simplify-auth-ui` 處理完成（2026-07-26），並通過單元測試與建置驗證。

| # | 違反的原則 | 事實 | 把握 | 狀態 |
|---|-----------|------|------|------|
| 1 | **測試壞掉（非原則類，功能性缺陷）** | `npx jest` 2/2 失敗，`eval()` 無法處理 `main.js` 內的 `import` 陳述式 | 高 | ✅ 已修復（改用 `jest.resetModules()` + `require()`，`main.js` 的 top-level await 改包進 `init()`） |
| 2 | **YAGNI** | 5 個 Vite 鷹架殘留死檔案（`counter.js`／`javascript.svg`／`vite.svg`／`hero.png`／`style copy.css`） | 高 | ✅ 已刪除，`npm run build` 驗證產物不受影響 |
| 3 | **API 層與 UI 層分離** | `fetch()` 直接寫在 DOM submit handler 內，無獨立 `api.js` | 高 | ✅ 已新增 `src/api.js`，`main.js` 改呼叫 `register()`/`login()` |
| 4 | **DRY（跨服務）** | `config-loader.js` 與 `persona-nexus-character` 幾乎逐字重複 | 中 | ✅ 本專案這邊已改採新模式（見上方範圍說明）；`persona-nexus-character` 側留待該服務自己輪次處理 |
| 5 | **SSOT／架構方向一致性（跨服務）** | 本專案仍用「向 `/api/config` 要絕對網址」的舊模式，`persona-nexus-lobby` 已改用寫死相對路徑、判定舊模式不再需要 | 中 | ✅ 已改用相對路徑常數（`/api/auth/*`、`LOBBY_PATH='/'`），`config-loader.js` 簡化為僅探測可達性 |
| 6 | **WCAG 4.1.3 狀態訊息** | `messageBox` 缺少 `aria-live`，動態訊息對螢幕報讀器不可見 | 中 | ✅ 已加上 `role="status" aria-live="polite"` |
| 7 | **關注點分離 SoC** | `main.js` 身兼多重角色；與第 3 點同根因，抽出 `api.js` 可望一併緩解 | 中 | ✅ 隨第 3 項一併緩解 |

## 做得好、不該動的部分

- 漸進增強：表單原生驗證（`required`/`type="email"`）
- 模組邊界：`config-loader.js` 的 `export`/`import` 與快取單例設計
- 環境設定外部化：API 網址不寫死（機制本身是否還有必要是另一回事，見上）
- 錯誤預防與回饋：訊息不暴露內部細節、失敗時保留表單內容
- 資源快取版本化：Vite content hash 機制正常運作（已實測）
- 表單 `<label>` 正確關聯（可及性基本盤有顧到）

---

## 誠實提醒

- **第 4、5 點屬於跨服務議題**：修正它們不只動 `persona-nexus-auth` 一個專案，可能牽動
  `persona-nexus-character`（DRY 那份重複）或需要向 `persona-nexus-lobby` 已示範的新模式看齊
  （SSOT／架構方向）。仿照後端 SOP 的先例（如「東西向流量是否統一經 gateway」），這類跨服務
  範圍的處理方式需要使用者裁示：本輪只在 `persona-nexus-auth` 內處理、或連動調整。
- **第 6 點（WCAG）把握中，非高**：`aria-live` 的缺漏是明確的技術事實，但「是否值得在學習性質
  專案的這個階段投入」是優先順序判斷，不是稽核本身能決定的。
- **Bundle Hygiene 一開始的直覺誤判已在稽核中自我修正**：讀碼時原本以為死檔案會拖累正式產物，
  實際 `npm run build` 後確認不成立，已如實在上表訂正，不讓「看起來像違反」的直覺蓋過實測結果。
- **一致性與標準（Nielsen）標「資訊不足」而非「符合」或「違反」**：因為沒有逐一讀完其他三個
  前端的 UI 文案與樣式做比對，誠實标示尚未判定，而非用單一服務的資訊硬下跨服務的結論。
