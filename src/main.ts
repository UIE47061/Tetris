import { createApp } from 'vue'
import './style.css' // 如果你有保留預設樣式
import App from './App.vue'
import router from './router' // 引入 router

const app = createApp(App)

app.use(router) // 掛載 router
app.mount('#app')