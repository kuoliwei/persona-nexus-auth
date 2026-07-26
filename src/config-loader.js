// 同源部署後，前端所有 API 呼叫都走相對路徑（/api/...），
// 因此不再需要從後端取得 gateway 或其他前端的網址。
//
// 這個模組只剩一個用途：啟動時確認後端可達。呼叫端會 catch 失敗並顯示
// 「無法連線至服務器」的畫面，所以這裡刻意讓錯誤往外拋。
let probed = false;

export async function loadConfig() {
  if (probed) return;

  const response = await fetch('/api/config');
  if (!response.ok) {
    throw new Error(`Gateway unreachable: HTTP ${response.status}`);
  }

  probed = true;
}
