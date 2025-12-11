<script setup lang="ts">
// App.vue 現在很乾淨，只要負責顯示路由內容
</script>

<template>
  <div class="app-container">
    <!-- 標題可以常駐，或者根據路由決定是否顯示 -->
    <h1 class="main-title">俄羅斯方塊 Tetris</h1>
    
    <!-- 這裡是用來顯示 Login, Game 或 Leaderboard 的地方 -->
    <router-view></router-view>
  </div>
</template>

<style scoped>
.app-container {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
  padding-top: 20px;
}

.main-title {
  color: #2c3e50;
  margin-bottom: 30px;
}
</style>