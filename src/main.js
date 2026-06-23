// 使用方式：npm run dev

// =========================================================================
// 🧠 Persona Nexus 終端機控制中心 (Front-end Controller) - 偵錯加強版
// =========================================================================

console.log('📡 [Nexus Web] main.js 腳本已成功載入，正在監聽表單神經元...');

// 1. 抓取 HTML 網頁元素 (元件神經接線)
const registerForm = document.getElementById('registerForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginEmailInput = document.getElementById('loginEmail');
const loginPasswordInput = document.getElementById('loginPassword');
const submitBtn = document.getElementById('submitBtn');
const loginBtn = document.getElementById('loginBtn');
const messageBox = document.getElementById('messageBox');
const tabRegister = document.getElementById('tabRegister');
const tabLogin = document.getElementById('tabLogin');
const loginForm = document.getElementById('loginForm');

// 檢查接線是否成功，萬一 HTML 沒有對上，這裡會立刻警報
if (!registerForm || !emailInput || !passwordInput || !loginEmailInput || !loginPasswordInput || !submitBtn || !loginBtn || !messageBox || !tabRegister || !tabLogin || !loginForm) {
  console.error('❌ [錯誤] HTML 元件接線失敗！請檢查 index.html 的 id 是否拼錯！');
} else {
  console.log('✅ [系統] HTML 元件接線成功。');
}

// 2. 載入設定並定義後台 API 的地址大門
import { loadConfig, getConfig } from './config-loader.js';

await loadConfig();
const config = getConfig();
const BACKEND_REGISTER_URL = `${config.services.gateway}/auth/register`;
const BACKEND_LOGIN_URL = `${config.services.gateway}/auth/login`;
const LOBBY_APP_URL = config.frontends.lobby;

/**
 * 輔助函式：用來在網頁上亮起成功或失敗的中文小貼紙
 */
function showMessage(type, text) {
  console.log(`📢 [畫面顯示] 類型: ${type} | 內容: ${text}`);
  messageBox.textContent = text;
  messageBox.classList.remove('success', 'error');
  messageBox.classList.add(type);
}
tabRegister.addEventListener('click', (event) => {
  tabLogin.classList.remove('active');
  tabRegister.classList.add('active');
  loginForm.style.display = 'none';
  registerForm.style.display = 'block';
  messageBox.classList.remove('success', 'error');
  messageBox.textContent = '';
}
)
tabLogin.addEventListener('click', (event) => {
  tabRegister.classList.remove('active');
  tabLogin.classList.add('active');
  registerForm.style.display = 'none';
  loginForm.style.display = 'block';
  messageBox.classList.remove('success', 'error');
  messageBox.textContent = '';
}
)
// 3. 監聽表單的「送出 (Submit)」事件
registerForm.addEventListener('submit', async (event) => {
  // 【核心步驟】阻止網頁預設的重新整理行為！
  event.preventDefault();

  console.log('🖱️ [動作] 使用者按下了註冊按鈕！觸發 submit 事件。');

  // 進入備戰狀態：將按鈕文字改成載入中，並暫時停用按鈕，防止使用者狂點
  submitBtn.textContent = '正在初始化連線...';
  submitBtn.disabled = true;

  // 偵錯小巧思：在網頁畫面上也先秀出正在連線的通知，這樣你就知道 JS 有在動！
  messageBox.style.display = 'block';
  showMessage('success', '⏳ 正在建立跨網域安全連線通道...');

  // 撈出使用者在畫面上輸入的真實帳密
  const requestBody = {
    email: emailInput.value,
    password: passwordInput.value
  };

  console.log('📦 [打包] 抓取到輸入框資料，打包準備發送：', {
    email: requestBody.email,
    password: '*** (已遮蔽安全密碼)'
  });

  try {
    console.log(`🚀 [發送] 正在發動 fetch() 請求前往：${BACKEND_REGISTER_URL}`);

    // 🚀 【跨網域大長征】發動 fetch() 去敲 Port 8000 後台的大門！
    const response = await fetch(BACKEND_REGISTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log(`📥 [回應] 收到後台回應！HTTP 狀態碼為：${response.status}`);

    // 解析後台回傳的包裹內容 (JSON)
    const result = await response.json();
    console.log('📄 [解析] 後台回傳的完整 JSON 資料物件：', result);

    if (response.ok) {
      console.log('🎉 [結果] 後台判定成功 (HTTP 201)！');
      showMessage('success', `🎉 帳號初始化成功！歡迎加入，您的 ID 為：${result.data.id}`);
      registerForm.reset();
    } else {
      console.warn(`❌ [結果] 後台退回請求 (HTTP ${response.status})，理由：${result.message}`);
      showMessage('error', `❌ 註冊失敗：${result.message}`);
    }

  } catch (error) {
    // 發生了網路斷線、後台根本沒開等「天災級」無法連線狀況
    console.error('💥 [天災] 前端連線發生嚴重錯誤，無法觸及後台伺服器！詳細崩潰原因：', error);
    showMessage('error', '❌ 無法連線至伺服器中樞，請確認後台服務已開啟且 Port 8000 沒有被佔用。');
  } finally {
    console.log('🏁 [結束] 註冊請求事務處理完畢，重置按鈕狀態。');
    // 任務結束：不論成功或失敗，都把按鈕復原
    submitBtn.textContent = '註冊';
    submitBtn.disabled = false;
  }
})
loginForm.addEventListener('submit', async (event) => {
  // 【核心步驟】阻止網頁預設的重新整理行為！
  event.preventDefault();

  console.log('🖱️ [動作] 使用者按下了登入按鈕！觸發 submit 事件。');

  // 進入備戰狀態：將按鈕文字改成載入中，並暫時停用按鈕，防止使用者狂點
  loginBtn.textContent = '正在初始化連線...';
  loginBtn.disabled = true;

  // 偵錯小巧思：在網頁畫面上也先秀出正在連線的通知，這樣你就知道 JS 有在動！
  messageBox.style.display = 'block';
  showMessage('success', '⏳ 正在建立跨網域安全連線通道...');

  // 撈出使用者在畫面上輸入的真實帳密
  const requestBody = {
    email: loginEmailInput.value,
    password: loginPasswordInput.value
  };

  console.log('📦 [打包] 抓取到輸入框資料，打包準備發送：', {
    email: requestBody.email,
    password: '*** (已遮蔽安全密碼)'
  });

  try {
    console.log(`🚀 [發送] 正在發動 fetch() 請求前往：${BACKEND_LOGIN_URL}`);

    // 🚀 【跨網域大長征】發動 fetch() 去敲 Port 8000 後台的大門！
    const response = await fetch(BACKEND_LOGIN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log(`📥 [回應] 收到後台回應！HTTP 狀態碼為：${response.status}`);

    // 解析後台回傳的包裹內容 (JSON)
    const result = await response.json();
    console.log('📄 [解析] 後台回傳的完整 JSON 資料物件：', result);

    if (response.ok) {
      console.log('🎉 [結果] 後台判定成功 (HTTP 200)！');
      showMessage('success', `🎉 帳號登入成功！歡迎，您的 ID 為：${result.data.id}`);
      loginForm.reset();
      const token = result.data.token;
      setTimeout(() => {
        window.location.href = `${LOBBY_APP_URL}/?token=${encodeURIComponent(token)}`;
      }, 1500);
    } else {
      console.warn(`❌ [結果] 後台退回請求 (HTTP ${response.status})，理由：${result.message}`);
      showMessage('error', `❌ 登入失敗：${result.message}`);
    }

  } catch (error) {
    // 發生了網路斷線、後台根本沒開等「天災級」無法連線狀況
    console.error('💥 [天災] 前端連線發生嚴重錯誤，無法觸及後台伺服器！詳細崩潰原因：', error);
    showMessage('error', '❌ 無法連線至伺服器中樞，請確認後台服務已開啟且 Port 8000 沒有被佔用。');
  } finally {
    console.log('🏁 [結束] 登入請求事務處理完畢，重置按鈕狀態。');
    // 任務結束：不論成功或失敗，都把按鈕復原
    loginBtn.textContent = '登入';
    loginBtn.disabled = false;
  }
})
  ;