## Why

> 這是一份**回溯性提案（retrospective proposal）**：persona-nexus-auth 已經實作完成並運作，
> 本文反推「當初若有正式提案，會怎麼寫」，補上行為規格（main spec）沒有記錄的**動機與範圍**。

Persona Nexus 平台採多頁前端架構，每個頁面各自是獨立的 Vite 專案。使用者要能建立帳號、
登入取得身分後才能進入大廳使用其他功能，因此需要一個**專責的入口頁**：只做註冊與登入的
UI、呼叫 api-gateway 完成帳密驗證，並在登入成功後把使用者送往大廳。

為什麼獨立成一個前端專案，而不是併進 lobby？

- **關注點分離**：「還沒登入」與「已登入」是使用者旅程中權限完全不同的兩個階段，UI 需求
  也不同（登入頁不需要側邊欄、角色列表等大廳才有的介面）。
- **獨立部署／演進**：登入頁的改動（例如換一套表單驗證邏輯）不需要牽動大廳的建置與部署。

## What Changes

建立 persona-nexus-auth，提供並僅提供以下能力：

- **註冊表單**：呼叫 `POST {gateway}/auth/register`，成功後顯示訊息並清空表單。
- **登入表單**：呼叫 `POST {gateway}/auth/login`，成功後把 token 帶在 URL query string，
  延遲 1.5 秒導向大廳。
- **執行期設定載入**：透過 `/api/config` 取得 gateway 與大廳網址，不寫死在程式碼裡。
- **頁籤切換**：註冊/登入兩個表單以 tab 按鈕互斥顯示。

**刻意不做（非本專案範圍）：**

- **不持久化 token**：token 只負責帶到大廳，寫入 `localStorage` 是大廳的職責。
- **不做進階表單驗證**：僅依賴瀏覽器原生 `required`/`type="email"`，後端回應驗證失敗訊息直接顯示，不在前端重複實作規則。
- **不處理註冊後自動登入**：註冊與登入是兩個獨立動作，註冊成功不會自動帶使用者進入已登入狀態。

## Impact

**新增對外依賴的 API 契約（由後端提供，本專案為消費方）：**
- `POST {gateway}/auth/register` → 成功 `{ id, email }`，失敗 `{ message }`
- `POST {gateway}/auth/login` → 成功 `{ id, email, token }`，失敗 `{ message }`
- `GET /api/config` → `{ services: { gateway }, frontends: { lobby, ... } }`

**新增外部依賴：**
- **api-gateway**（經 Caddy 同源代理）— 認證請求與執行期設定的唯一入口。
- **persona-nexus-lobby** — 登入成功後的導向目標，且負責接手 token 的持久化。

**技術棧：**
- Vite 8（build tool，無 UI 框架）；Jest 30 + Babel + jsdom（測試）。

**行為契約詳見** `openspec/specs/auth-ui/spec.md`（現況基準線規格）。
**架構決策與取捨詳見** 同目錄 `design.md`。
