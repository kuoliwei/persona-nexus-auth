# Persona Nexus Auth

使用者帳號系統的**登入/註冊頁**，是一組多專案微服務架構中的其中一個前端。整體系統的目標是「角色 AI 連結中樞」，這個專案負責使用者註冊與登入。

## 整體架構

```
瀏覽器
  │
  ├─ 靜態頁面（不經過 Gateway，各前端各自用 Vite dev server 提供）
  │
  └─ API 請求（一定經過 Gateway）
        瀏覽器 → api-gateway (8000) → auth-service (3000) / user-service (4000) / character-service (5000)
```

| 專案 | 角色 | Port | 路徑 |
|---|---|---|---|
| persona-nexus-lobby | 角色大廳，系統首頁 | 5175 | `C:\Users\MSI3090\persona-nexus-platform\persona-nexus-lobby` |
| **persona-nexus-auth**（本專案） | 登入 / 註冊頁 | 5173（已用 `vite.config.js` 固定 + `strictPort: true`） | `C:\Users\MSI3090\persona-nexus-platform\persona-nexus-auth` |
| api-gateway | 統一 API 入口，反向代理到各 service | 8000 | `C:\Users\MSI3090\persona-nexus-platform\api-gateway` |
| auth-service | 處理註冊 / 登入，簽發 JWT | 3000 | `C:\Users\MSI3090\persona-nexus-platform\auth-service` |
| user-service | 使用者資料服務 | 4000 | `C:\Users\MSI3090\persona-nexus-platform\user-service` |

**前端從不直接打各 service，一律打 api-gateway。**

## 本專案結構

- `index.html` — 註冊/登入表單 UI（兩個表單 + tab 切換）
- `src/style.css` — 暗色科技風格樣式
- `src/main.js` — 表單事件處理、fetch() 呼叫 api-gateway 的 `/auth/register`、`/auth/login`
- `src/main.test.js` — Jest 單元測試（jsdom 環境，用 `eval()` 載入 main.js），目前只測「送出表單時按鈕會 disable 並顯示載入文字」兩個情境，沒有測 API 成功/失敗後的實際行為
- `vite.config.js` — 固定 dev server port 為 5173，`strictPort: true`，避免 port 衝突時悄悄跳號

## 關鍵 API 端點

- `POST http://localhost:8000/auth/register`
- `POST http://localhost:8000/auth/login`

（Gateway 內部會 `pathRewrite` 成 auth-service 的 `/api/v1/auth/*`）

## ⚠️ 重要缺口：登入成功後沒有存 token、沒有跳轉

直接讀 `src/main.js` 確認：**登入成功後目前完全沒有把回應裡的 JWT 寫進 `localStorage`，也沒有任何 `window.location` 跳轉到大廳（5175）。** 登入成功只會 reset 表單、顯示成功訊息。

這跟其他專案的 CLAUDE.md（`persona-nexus-lobby`、`persona-nexus-character`）裡假設的「登入後 token 存在 localStorage」前提不一致——那兩個專案的 `getCurrentUserId()` 都是去讀 `localStorage` 裡的 token，如果這裡從來沒寫入，使用者實際上登入後會卡住，無法進入大廳或角色編輯頁。**這是目前整條登入流程裡唯一真正阻斷使用者路徑的缺口**，需要在這裡補上：登入 fetch 成功後，把 response 裡的 token 存進 `localStorage`（key 名稱要和 `persona-nexus-lobby`/`persona-nexus-character` 的 `getCurrentUserId()` 讀的 key 一致），並導向 `http://localhost:5175/`。

## 已知問題與修法記錄

- **CORS 穿透問題**（已解決）：auth-service 的 CORS 原本只允許 Gateway 的 origin，但 Gateway 用 `http-proxy-middleware` 轉發時，auth-service 的 `Access-Control-Allow-Origin` header 會原封不動傳回瀏覽器，導致瀏覽器（5173）被拒絕。修法是在 api-gateway 的 proxy 裡用 `on.proxyRes` 刪除上游的 CORS header，讓 Gateway 自己的 `cors()` 中介層負責跟瀏覽器溝通。此修法在 api-gateway 專案處理，已確認生效。

## 協作慣例

- 使用者目標是**學習如何建構系統**，不是要 Claude 直接代寫。遇到變更需求時，優先解釋原理、給出步驟，讓使用者自己動手改，除非使用者明確要求直接修改。
- 解釋時要說明「為什麼」（why），不只是「怎麼做」（how）。
- 正式環境的對應方式（給未來部署用）：本機 port 寫死的做法只是開發環境的應急手段；正式環境會用環境變數（如 `VITE_AUTH_URL`）區分不同環境的網址，並透過 Nginx 等反向代理統一對外只開放 80/443。

## 現況補充

- 有 git（`.git` 存在）
- 沒有 lint 設定檔
- `package.json` 只有 vite + jest/babel 相關 devDependencies，沒有任何 UI 框架或 axios 等第三方套件
