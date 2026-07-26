/**
 * @jest-environment jsdom
 */
// 💡 上面這行註解是關鍵！它告訴 Jest：這個檔案要在「虛擬瀏覽器」環境下執行

// 建立一個讓非同步排隊小助理
const flushPromises = () => new Promise(jest.requireActual('timers').setImmediate);

describe('Frontend main.js 網頁互動單元測試', () => {
  let submitBtn, loginBtn, messageBox, registerForm, loginForm, emailInput, passwordInput, loginEmailInput, loginPasswordInput, tabRegister, tabLogin;

  beforeEach(async () => {
    // 1. 安排 (Arrange)：在虛擬瀏覽器裡蓋出我們需要的 HTML 骨架
    document.body.innerHTML = `
      <button type="button" id="tabRegister" class="active">註冊</button>
      <button type="button" id="tabLogin">登入</button>
      <form id="registerForm">
        <input type="email" id="email">
        <input type="password" id="password">
        <button type="submit" id="submitBtn">初始化帳號</button>
      </form>
      <form id="loginForm">
        <input type="email" id="loginEmail">
        <input type="password" id="loginPassword">
        <button type="submit" id="loginBtn">初始化帳號</button>
      </form>
      <div id="messageBox" style="display: none;"></div>
    `;

    // 2. main.js 載入時會先呼叫 config-loader 的 loadConfig()，對 /api/config 探測一次。
    //    這裡先把它模擬成「後端可達」，個別測試如果要測失敗案例會自己覆寫。
    global.fetch = jest.fn((url) => {
      if (url === '/api/config') {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 'usr_mock_777' }),
      });
    });

    // 3. 每次都重新載入 main.js 這個模組，模擬瀏覽器每次重新整理頁面都會重新執行一次接線邏輯
    jest.resetModules();
    require('./main.js');

    // main.js 的 init() 是 async function，需要讓它把 loadConfig() 的 await 跑完，
    // 事件監聽器才會真的掛上去
    await flushPromises();

    // 4. 抓出虛擬房子裡的元件，方便等一下做斷言檢查
    tabRegister = document.getElementById('tabRegister');
    tabLogin = document.getElementById('tabLogin');
    registerForm = document.getElementById('registerForm');
    loginForm = document.getElementById('loginForm');
    emailInput = document.getElementById('email');
    passwordInput = document.getElementById('password');
    loginEmailInput = document.getElementById('loginEmail');
    loginPasswordInput = document.getElementById('loginPassword');
    submitBtn = document.getElementById('submitBtn');
    loginBtn = document.getElementById('loginBtn');
    messageBox = document.getElementById('messageBox');
  });

  // 【核心測試案例：驗證按鈕點擊後的網頁狀態切換】
  test('當使用者點擊註冊按鈕時，按鈕應立刻進入「連線中」的停用狀態，且提示框應顯示', async () => {
    // 安排：模擬使用者在畫面上填好資料
    emailInput.value = 'ironman@test.com';
    passwordInput.value = 'jarvis123';

    // 執行 (Act)：模擬使用者點擊按鈕送出表單
    // 這會觸發 main.js 裡面的 registerForm.addEventListener('submit', ...)
    registerForm.dispatchEvent(new Event('submit'));

    // 斷言 (Assert)：檢查 main.js 到底有沒有乖乖啟動神經網絡？

    // 斷言 A：按鈕文字有沒有如預期變成「正在處理...」？
    expect(submitBtn.textContent).toBe('正在處理...');

    // 斷言 B：按鈕此時有沒有被「停用 (disabled)」，防止使用者重複瘋狂狂點？
    expect(submitBtn.disabled).toBe(true);

    // 斷言 C：訊息框有沒有被更新（初始化流程已把它切到 block）？
    await flushPromises();
    expect(messageBox.style.display === 'block' || messageBox.textContent.length > 0).toBe(true);
  });

  test('當使用者點擊登入按鈕時，按鈕應立刻進入「連線中」的停用狀態，且提示框應顯示', async () => {
    // 安排：模擬使用者在畫面上填好資料
    loginEmailInput.value = 'ironman@test.com';
    loginPasswordInput.value = 'jarvis123';

    // 執行 (Act)：模擬使用者點擊按鈕送出表單
    // 這會觸發 main.js 裡面的 loginForm.addEventListener('submit', ...)
    loginForm.dispatchEvent(new Event('submit'));

    // 斷言 (Assert)：檢查 main.js 到底有沒有乖乖啟動神經網絡？

    // 斷言 A：按鈕文字有沒有如預期變成「正在處理...」？
    expect(loginBtn.textContent).toBe('正在處理...');

    // 斷言 B：按鈕此時有沒有被「停用 (disabled)」，防止使用者重複瘋狂狂點？
    expect(loginBtn.disabled).toBe(true);

    await flushPromises();
    expect(messageBox.style.display === 'block' || messageBox.textContent.length > 0).toBe(true);
  });
});
