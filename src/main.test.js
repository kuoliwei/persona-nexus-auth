/**
 * @jest-environment jsdom
 */
// 💡 上面這行註解是關鍵！它告訴 Jest：這個檔案要在「虛擬瀏覽器」環境下執行

import fs from 'fs';
import path from 'path';

// 建立一個讓非同步排隊小助理
const flushPromises = () => new Promise(jest.requireActual('timers').setImmediate);

describe('Frontend main.js 網頁互動單元測試', () => {
  let submitBtn, loginBtn, messageBox, registerForm, loginForm, emailInput, passwordInput, loginEmailInput, loginPasswordInput, tabRegister, tabLogin;

  beforeEach(() => {
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

    // // 2. 模擬瀏覽器內建的全球特派員 fetch()
    // // 單元測試不准真的連網去敲 Port 3000，所以我們做一個假演員攔截它
    // global.fetch = jest.fn(() =>
    //   Promise.resolve({
    //     ok: true,
    //     status: 201,
    //     json: () => Promise.resolve({ status: 'success', data: { id: 'usr_mock_777' } }),
    //   })
    // );

    // 3. 讀取並強行載入我們的實體 main.js 檔案
    // 因為程式碼一載入就會執行接線，此時它抓到的 document 就會是我們上面蓋的這棟虛擬房子
    const scriptCode = fs.readFileSync(path.resolve(__dirname, './main.js'), 'utf8');
    eval(scriptCode); 

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
    // 單元測試不准真的連網去敲 Port 3000，所以我們做一個假演員攔截它
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ status: 'success', data: { id: 'usr_mock_777' } }),
      })
    );
    // 安排：模擬使用者在畫面上填好資料
    emailInput.value = 'ironman@test.com';
    passwordInput.value = 'jarvis123';

    // 執行 (Act)：模擬使用者點擊按鈕送出表單
    // 這會觸發 main.js 裡面的 registerForm.addEventListener('submit', ...)
    registerForm.dispatchEvent(new Event('submit'));

    // 斷言 (Assert)：檢查 main.js 到底有沒有乖乖啟動神經網絡？
    
    // 斷言 A：按鈕文字有沒有如預期變成「正在初始化連線...」？
    expect(submitBtn.textContent).toBe('正在初始化連線...');

    // 斷言 B：按鈕此時有沒有被「停用 (disabled)」，防止使用者重複瘋狂狂點？
    expect(submitBtn.disabled).toBe(true);

    // 斷言 C：原本隱藏的訊息框，有沒有被強制打開 (block) 改為看得到？
    expect(messageBox.style.display).toBe('block');
  });
    test('當使用者點擊登入按鈕時，按鈕應立刻進入「連線中」的停用狀態，且提示框應顯示', async () => {
    // 單元測試不准真的連網去敲 Port 3000，所以我們做一個假演員攔截它
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'success', data: { id: 'usr_mock_777' } }),
      })
    );
    // 安排：模擬使用者在畫面上填好資料
    loginEmailInput.value = 'ironman@test.com';
    loginPasswordInput.value = 'jarvis123';

    // 執行 (Act)：模擬使用者點擊按鈕送出表單
    // 這會觸發 main.js 裡面的 loginForm.addEventListener('submit', ...)
    loginForm.dispatchEvent(new Event('submit'));

    // 斷言 (Assert)：檢查 main.js 到底有沒有乖乖啟動神經網絡？
    
    // 斷言 A：按鈕文字有沒有如預期變成「正在初始化連線...」？
    expect(loginBtn.textContent).toBe('正在初始化連線...');

    // 斷言 B：按鈕此時有沒有被「停用 (disabled)」，防止使用者重複瘋狂狂點？
    expect(loginBtn.disabled).toBe(true);

    // 斷言 C：原本隱藏的訊息框，有沒有被強制打開 (block) 改為看得到？
    expect(messageBox.style.display).toBe('block');
  });
});