<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const records = ref<{name: string, score: number}[]>([]);

onMounted(() => {
  // 1. 先嘗試讀取 LocalStorage (剛才 TetrisGame 存的)
  const localData = JSON.parse(localStorage.getItem('tetris_local_records') || '[]');
  
  // 2. 模擬後端資料 (如果沒有後端，就用這個假資料)
  if (localData.length === 0) {
    records.value = [
      { name: 'Alpha', score: 12000 },
      { name: 'Beta', score: 8500 },
      { name: 'Gamma', score: 5000 },
    ];
  } else {
    records.value = localData;
  }
});

const clearRecords = () => {
  localStorage.removeItem('tetris_local_records');
  records.value = [];
};
</script>

<template>
  <div class="lb-container">
    <div class="glass-card">
      <div class="lb-header">
        <h3>🏆 Hall of Fame</h3>
        <button class="secondary-btn close-btn" @click="router.push('/')">返回</button>
      </div>

      <div class="lb-list">
        <div v-if="records.length === 0" class="no-data">暫無紀錄</div>
        <div v-for="(rec, index) in records" :key="index" class="lb-item">
          <span class="rank" :class="'rank-'+(index+1)">{{ index + 1 }}</span>
          <span class="name">{{ rec.name }}</span>
          <span class="score">{{ rec.score }}</span>
        </div>
      </div>

      <button @click="clearRecords" class="secondary-btn" style="margin-top:20px; font-size: 12px;">清除本機紀錄</button>
    </div>
  </div>
</template>

<style scoped>
.lb-container {
  width: 100%;
  display: flex;
  justify-content: center;
  padding-top: 40px;
}
.lb-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--glass-border);
  padding-bottom: 10px;
}
.close-btn { width: auto; padding: 5px 10px; font-size: 12px; }
.lb-list { max-height: 400px; overflow-y: auto; }
.lb-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255,255,255,0.02);
}
.rank { font-weight: bold; width: 30px; text-align: left; color: var(--muted); }
.rank-1 { color: #ffd700; }
.rank-2 { color: #c0c0c0; }
.rank-3 { color: #cd7f32; }
.name { flex: 1; text-align: left; padding-left: 10px; }
.score { font-family: monospace; font-size: 1.1rem; color: var(--accent); }
</style>