// 同源部署下，頁面與 api-gateway 永遠同一個 origin（經 Caddy 轉發），
// 註冊/登入的網址可以直接寫死成相對路徑，不需要再從 /api/config 動態組裝。
const REGISTER_URL = '/api/auth/register';
const LOGIN_URL = '/api/auth/login';

async function postCredentials(url, email, password) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  const result = await response.json();
  return { ok: response.ok, status: response.status, result };
}

export function register(email, password) {
  return postCredentials(REGISTER_URL, email, password);
}

export function login(email, password) {
  return postCredentials(LOGIN_URL, email, password);
}
