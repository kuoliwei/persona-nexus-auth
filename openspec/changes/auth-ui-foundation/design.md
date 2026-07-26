# Design — auth-ui-foundation

> 忠實記錄 persona-nexus-auth **當前的設計結構**。行為（做什麼）在 main spec，本文記錄
> **結構與決策（怎麼組成的）**。只描述現況，不寫理由、不做評判。

## 頁面結構

單一 `index.html`，無前端路由。內含兩個 `<form>`（`registerForm`、`loginForm`）與兩個
tab 按鈕（`tabRegister`、`tabLogin`），互斥顯示由 `style.display` 直接控制。

## 腳本結構（無框架、無元件化）

`src/main.js` 是唯一的行為腳本，載入時：
1. 用 `document.getElementById` 逐一抓取所有需要的 DOM 元素，存成模組頂層變數。
2. 檢查是否有抓取失敗（`null`），失敗時 `console.error` 但不中斷執行。
3. `import` 並呼叫 `config-loader.js` 的 `loadConfig()`（頂層 `await`）。
4. 依 config 組出三個 URL 常數，並對兩個表單各自綁定一個 `submit` 事件監聽器、
   對兩個 tab 按鈕各自綁定一個 `click` 事件監聽器。

`showMessage(type, text)` 是唯一的共用輔助函式，負責寫入 `messageBox` 的文字與 class。

## 設定載入（config-loader.js）

`loadConfig()`／`getConfig()` 是模組層級的單例快取（`let config = null`）：第一次呼叫才真的
`fetch('/api/config')`，之後回傳快取值。`getConfig()` 若在 `loadConfig()` 完成前呼叫會拋錯。

## 與後端的整合方式

- `main.js` 直接用原生 `fetch()`，無封裝的 API client 模組（相對於 `persona-nexus-lobby`
  有獨立的 `api.js`，本專案的兩支 `fetch()` 呼叫直接寫在對應的 submit handler 內）。
- 錯誤處理策略：`response.ok` 為 false 時讀 `result.message` 顯示；`fetch()` 本身丟例外
  （網路層）時一律顯示固定文案，不把例外內容暴露給使用者。

## 登入成功後的導向機制

`window.location.href` 賦值，帶 `?token=` query string，前面接一個 `setTimeout(1500)`。
這個延遲與導向邏輯直接寫在 `loginForm` 的 submit handler 裡，未抽成獨立函式。

## 現存但與本專案功能無關的檔案

- `src/counter.js`：Vite 鷹架預設範例（計數器元件），未被 `index.html` 或 `main.js` 引用。
- `src/javascript.svg`、`src/vite.svg`、`src/hero.png`：鷹架預設圖檔，未被任何 CSS/HTML 引用。
- `src/style copy.css`：內容與生效中的 `src/style.css`完全不同（是另一套鷹架範例樣式），
  未被 `index.html` 引用。

## 測試結構

`src/main.test.js` 用 `fs.readFileSync` + `eval()` 把 `main.js` 的原始碼字串載入 jsdom
環境執行（而非用 `import`），每個 `test` 各自在 `beforeEach` 重建一份 DOM 骨架後重新
`eval()` 一次。目前兩個 `test` 都只斷言表單送出瞬間的按鈕狀態變化，`fetch` 的 mock 回應
內容存在但沒有對應的斷言去驗證訊息框最終顯示的文字或導向行為。

## 其他現況

- 無 lint 設定檔、無 TypeScript。
- `package.json` 的 `devDependencies` 僅含 vite、jest 與其 Babel 相關套件；`dependencies`
  欄位不存在（無任何正式相依套件）。
- Vite 設定：`base: '/login/'`、`server.port: 5173`（`strictPort: true`）、`server.host: true`、
  `server.allowedHosts: true`，均服務於 Caddy 同源反向代理架構。
