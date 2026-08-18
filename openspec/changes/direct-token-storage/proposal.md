## Why

登入成功後，token 目前透過 URL query string（`?token=...`）整頁導航帶給 lobby，由 lobby 的
`main.js` 負責寫入 `localStorage`、清除網址參數（`auth/src/main.js:161-168`、
`lobby/src/main.js:32-41`）。這是同源部署前（auth 與 lobby 各自獨立 port，真正跨源）留下的
做法；現在兩者經 Caddy 收斂到同一個 origin（`deploy/Caddyfile:32-73`），`localStorage` 本來
就跨這兩個前端共享，網址傳遞已無必要，只留下暴露面（瀏覽器歷史記錄、referrer、伺服器存取
日誌都可能記到 token）。`persona-nexus-rpg-scene` 已示範「不經網址、直接讀 localStorage」的
正統模式（`rpg-scene/src/api.js:5-7`），但那是 iframe 子頁的情境，跟這裡「整頁導航交接」的
機制不同，不能直接套用，需要單獨設計。

這次只統一「傳遞機制」——直接在 auth 端寫入 `localStorage`，不改動存放方案本身（`localStorage`
vs `httpOnly` cookie 屬於更大範圍的資安決策，已與使用者確認排除在本輪之外，見 design.md「延伸
待辦」）。

## What Changes

- 新增 `src/session.js`，提供 `setToken(token)`（唯一函式；auth 本身從不讀 token，不需要
  `getToken()`/`clearToken()`）
- `main.js` 登入成功分支：在原有 1500ms `setTimeout` 回呼內，`window.location.href` 導頁前
  先呼叫 `setToken(result.token)`，導向網址不再帶 `?token=`（改成 `window.location.href = LOBBY_PATH`）
- 更新 `openspec/specs/auth-ui/spec.md` 的「使用者登入與導向大廳」需求與 Non-goals 段落，
  移除「本專案不得寫入 localStorage」的既有限制敘述

## Capabilities

### Modified Capabilities
- `auth-ui`：「使用者登入與導向大廳」需求改為登入成功時直接寫入 `localStorage`，不再透過
  URL query string 交接

## Impact

**受影響檔案：** `src/main.js`、新增 `src/session.js`

**跨專案依賴：** lobby 端（`persona-nexus-lobby`）需同步移除消費 `?token=` 的邏輯
（`lobby/src/main.js:32-41`），否則舊書籤/舊分頁若還帶 `?token=` 會被降級忽略（lobby 不再
讀取，直接視為未登入導回登入頁）——這是可接受的行為，不是 bug。對應 change：
`auth-token-handoff-cleanup`（`persona-nexus-lobby` repo）。

**不影響：** lobby↔character/chat/rpg-scene 的 iframe token 傳遞（獨立的既有落差，不在本輪
範圍）、token 內容與 7 天效期（`auth-service` 不變）、`localStorage` 作為存放方案本身（維持
現況，汰換為 `httpOnly` cookie 屬於另一輪更大範圍的資安決策）
