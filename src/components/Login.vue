<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// 狀態
const step = ref<'auth' | 'menu'>('auth');
const isRegister = ref(false); // 切換 登入/註冊 模式
const username = ref('');
const password = ref('');
const errorMessage = ref('');
const isLoading = ref(false);

// 處理登入或註冊
const handleAuth = async () => {
  if (!username.value || !password.value) {
    errorMessage.value = '請輸入帳號與密碼';
    return;
  }
  
  errorMessage.value = '';
  isLoading.value = true;

  try {
    // 雖然還沒接後端，但我先把正確的 Axios 結構寫好
    // 如果你要測試前端畫面，可以把 try 裡面的 axios 註解掉，直接跑下面模擬區
    
    /* --- 真實後端串接區 (等後端寫好後解除註解) --- */
    // const url = isRegister.value 
    //   ? 'http://localhost:8080/api/auth/register' 
    //   : 'http://localhost:8080/api/auth/login';
    
    // const res = await axios.post(url, {
    //   username: username.value,
    //   password: password.value
    // });

    // if (isRegister.value) {
    //   alert('註冊成功，請登入');
    //   isRegister.value = false; // 切換回登入
    //   isLoading.value = false;
    //   return;
    // } else {
    //   // 登入成功，儲存 Token
    //   localStorage.setItem('token', res.data.token);
    //   localStorage.setItem('username', res.data.username);
    //   step.value = 'menu';
    // }
    /* ------------------------------------------- */

    // --- 模擬區 (暫時使用，讓你測試 UI) ---
    console.log(`模擬發送: ${isRegister.value ? '註冊' : '登入'}`, { u: username.value, p: password.value });
    setTimeout(() => {
      if (isRegister.value) {
        alert('模擬：註冊成功！請切換到登入');
        isRegister.value = false;
      } else {
        localStorage.setItem('token', 'mock_jwt_token_123456');
        localStorage.setItem('username', username.value);
        step.value = 'menu';
      }
      isLoading.value = false;
    }, 800);
    // -------------------------------------

  } catch (error: any) {
    console.error(error);
    errorMessage.value = error.response?.data || '連線失敗或帳密錯誤';
    isLoading.value = false;
  }
};

const startGame = () => {
  router.push('/game');
};

const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  step.value = 'auth';
  username.value = '';
  password.value = '';
};
</script>

<template>
  <div class="login-container">
    <div class="glass-card">
      
      <!-- 階段一：驗證 (Login/Register) -->
      <div v-if="step === 'auth'">
        <h2>{{ isRegister ? '建立帳戶' : '會員登入' }}</h2>
        <p class="subtitle">Tetris Game Challenge</p>
        
        <input 
          v-model="username" 
          class="glass-input" 
          placeholder="帳號 (Username)" 
          maxlength="20"
        />
        <input 
          v-model="password" 
          type="password"
          class="glass-input" 
          placeholder="密碼 (Password)" 
          @keyup.enter="handleAuth"
        />

        <p v-if="errorMessage" class="error-msg">{{ errorMessage }}</p>

        <button class="primary-btn" @click="handleAuth" :disabled="isLoading">
          {{ isLoading ? '處理中...' : (isRegister ? '註冊' : '登入') }}
        </button>

        <div class="switch-mode" @click="isRegister = !isRegister">
          {{ isRegister ? '已有帳號？點此登入' : '還沒有帳號？點此註冊' }}
        </div>
      </div>

      <!-- 階段二：主選單 (已登入) -->
      <div v-else class="menu-phase">
        <h2 class="welcome-text">Hi, {{ username }}</h2>
        
        <div class="menu-grid">
          <button class="menu-btn" @click="startGame">
            開始遊戲 (Start Game)
          </button>
          
          <button class="menu-btn" @click="router.push('/leaderboard')">
            排行榜 (Leaderboard)
          </button>
        </div>

        <button class="secondary-btn" @click="logout">登出</button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.login-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

h2 { margin: 0 0 10px 0; font-weight: 700; letter-spacing: 0.5px; }
.subtitle { color: var(--muted); font-size: 0.9rem; margin-bottom: 20px; }
.welcome-text { color: var(--accent); margin-bottom: 20px; }
.error-msg { color: #ff5c67; font-size: 0.85rem; margin-bottom: 10px; }

.menu-grid { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }

.switch-mode {
  margin-top: 15px;
  font-size: 0.85rem;
  color: var(--muted);
  cursor: pointer;
  text-decoration: underline;
  opacity: 0.8;
}
.switch-mode:hover { color: var(--accent); opacity: 1; }
</style>