## Why

依《前端系統設計原則》稽核 `persona-nexus-auth`（見 `mistake.md`）找到的候選違反點，使用者逐項核對後
確認納入本輪處理範圍（僅排除純跨服務的技術債留待日後一併評估——見下方 Impact 的範圍註記）：

1. 單元測試目前 0/2 全部失敗（高把握，已實跑驗證）
2. YAGNI：5 個 Vite 鷹架殘留死檔案
3. API 層與 UI 層分離：`fetch()` 直接寫在 DOM handler 內
4. DRY（跨服務）：`config-loader.js` 與 `persona-nexus-character` 幾乎逐字重複
5. SSOT／架構方向一致性（跨服務）：仍用舊的「執行期取得絕對網址」模式，`persona-nexus-lobby` 已改用相對路徑
6. WCAG 4.1.3：`messageBox` 動態訊息缺少 `aria-live`
7. 關注點分離 SoC：`main.js` 身兼多重角色

## What Changes

- **刪除死代碼**：`src/counter.js`、`src/javascript.svg`、`src/vite.svg`、`src/hero.png`、`src/style copy.css`。
- **新增 `src/api.js`**：把 `POST /auth/register`、`POST /auth/login` 的 `fetch()` 呼叫、URL 組裝、
  請求/回應格式封裝進來，`main.js` 改為呼叫 `register()`/`login()`，不再直接操作 `fetch`。
  同時解決第 3 項（API 層分離）與第 7 項（SoC）——`main.js` 之後只負責 DOM 接線、UI 回饋、導向邏輯。
- **簡化 `src/config-loader.js`**：比照 `persona-nexus-lobby` 已驗證過的模式，改為「只探測後端
  是否可達」，不再向 `/api/config` 索取 `services.gateway`／`frontends.lobby` 拿去組絕對網址。
  `api.js` 與導向邏輯改用寫死的相對路徑常數（`/api/auth/*`、`/`），因為同源部署（Caddy）下
  相對路徑與原本組出的絕對網址在瀏覽器裡指向完全相同的位置。這同時解決第 5 項（SSOT／架構
  方向一致性，向 lobby 已示範的新模式看齊）。
  **第 4 項（DRY，與 persona-nexus-character 重複）在本專案這邊的處理方式**：本專案的
  `config-loader.js` 之後不再是「與 character 逐字重複的舊版本」，而是改採 lobby 的新版本
  （新的重複對象換成 lobby，但 lobby 的版本已代表平台目前驗證過的正確方向）。
  `persona-nexus-character` 那份仍是舊版本，**不在本次變更範圍內**——它是獨立 git repo，
  需要等到 character 自己的稽核輪次再處理，屬於誠實的範圍界定，而非遺漏。
- **`main.js` 內部重構**：把原本的 top-level `await loadConfig()` 改寫成一個 async 初始化函式
  （`init()`）在模組底部呼叫，不影響任何外部可觀察行為，純粹是讓测试能用正規的模組載入方式
  （而非 `eval()`）重新執行模組。
- **修復壞掉的單元測試**：`main.test.js` 改用 `jest.resetModules()` + `require('./main.js')`
  取代 `eval(fs.readFileSync(...))`，並補上對 `/api/config` 探測請求的 mock。
- **可及性修正**：`index.html` 的 `#messageBox` 加上 `role="status"` 與 `aria-live="polite"`，
  讓螢幕報讀器能主動朗讀註冊/登入成功或失敗訊息。

## Impact

**可觀察行為變更（需要留意，但正常操作路徑下結果相同）：**
- 註冊/登入請求改打相對路徑 `/api/auth/register`、`/api/auth/login`，取代原本經 `/api/config`
  動態組出的絕對網址。**只在透過 Caddy 同源存取時行為等價**（現況即是如此，見 `CLAUDE.md`）；
  若之後有人繞過 Caddy 直接開裸 port 存取本頁面，行為會與現況一樣壞掉（`config-loader.js`
  本來就已經聲明不支援裸 port，非本次變更引入的新限制）。
- 登入成功後的導向網址從 `${LOBBY_APP_URL}/?token=...`（原本讀 `/api/config` 取得，預設值
  同為 `http://localhost:8080`）改為寫死的相對路徑 `/?token=...`。同源部署下結果相同。
- `messageBox` 新增 `aria-live`／`role="status"`：純新增屬性，不影響既有視覺或互動行為，
  只新增螢幕報讀器會朗讀動態訊息的行為。

**不影響行為（純重構/清理）：**
- 刪除的 5 個死檔案未被任何程式碼引用，刪除前已用 `npm run build` 驗證不影響產物。
- `api.js` 抽取、`main.js` 的 `init()` 重構、測試載入方式改變，皆不改變使用者可觀察到的行為。

**範圍排除（誠實記錄，非本次處理）：**
- `persona-nexus-character` 的 `config-loader.js` 重複問題，留待該服務自己的稽核輪次處理。

**行為契約詳見** `openspec/specs/auth-ui/spec.md` 的 MODIFIED delta。
