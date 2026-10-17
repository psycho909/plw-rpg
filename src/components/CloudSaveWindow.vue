<script setup lang="ts">
import { computed } from 'vue'
import { useCloudStore } from '../stores/cloudStore'
import { useGameStore } from '../stores/gameStore'
import { unpackCheckpoint } from '../services/playJournal'
import { clockLabel } from '../engine/calendar'

const cloud = useCloudStore(), game = useGameStore()
const available = computed(() => cloud.enabled && !!cloud.session && cloud.online && game.writerReady && !cloud.busy && !cloud.authRequired)
const statuses: Record<string, string> = { disabled: '雲端存檔尚未設定', 'signed-out': '尚未登入', ready: '雲端已連線',
  offline: '離線：繼續保留本機進度', auth: '請重新登入', conflict: '存檔版本衝突', invalid: '存檔驗證失敗' }
function backup(raw: string) {
  const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }))
  try {
    const link = document.createElement('a')
    link.href = url; link.download = `oakvale-checkpoint-${Date.now()}.json`
    document.body.appendChild(link); link.click(); link.remove()
    return true
  } finally { setTimeout(() => URL.revokeObjectURL(url), 1000) }
}
function load() {
  void cloud.loadCloud(backup, (row, raw) => {
    const local = unpackCheckpoint(raw)
    const unsynced = !cloud.metadata || local.lastSavedAt > cloud.metadata.syncedAt || local.journal.worldId !== cloud.metadata.worldId
    return window.confirm(`請確認本機 checkpoint 備份檔已下載並妥善保存。\n本機世界：${local.journal.worldId} · ${clockLabel(local.state.worldTime)}${unsynced ? '（有尚未同步的本機進度）' : ''}\n雲端世界：${row.world_id} · ${clockLabel(row.world_time)} · revision ${row.revision}\n載入會取代本機進度並重新整理，確定繼續？`)
  })
}
function upload() {
  if (window.confirm('確定將目前本機存檔上傳至雲端？')) { if (game.save()) void cloud.upload() }
}
function overwrite() {
  if (!game.save()) return
  void cloud.overwriteCloud(row => window.confirm(`確定以目前本機進度取代${row ? `雲端 revision ${row.revision}（${clockLabel(row.world_time)}）` : '雲端空存檔'}？雲端原進度將被覆蓋。`))
}
</script>

<template>
  <section aria-label="雲端存檔">
    <p role="status" aria-live="polite">{{ cloud.busy ? '雲端處理中…' : statuses[cloud.status] }}</p>
    <p v-if="!cloud.enabled" class="help-text">本機存檔與遊玩仍可正常使用。</p>
    <template v-else>
      <p>GitHub 帳號：{{ cloud.account || '尚未登入' }}</p>
      <p>最後成功同步：{{ cloud.lastSyncedAt ? new Date(cloud.lastSyncedAt).toLocaleString('zh-TW') : '尚未同步' }}</p>
      <p v-if="cloud.cloud">雲端 revision {{ cloud.cloud.revision }} · {{ clockLabel(cloud.cloud.world_time) }}<br>世界：{{ cloud.cloud.world_id }}</p>
      <p v-if="!game.writerReady" class="help-text">此分頁沒有存檔寫入權，請使用持有寫入權的分頁。</p>
      <p v-if="cloud.errorMessage" role="alert" class="inline-warning">{{ cloud.errorMessage }}</p>
      <div class="action-buttons">
        <button v-if="!cloud.session || cloud.authRequired" :disabled="cloud.busy || !cloud.online" @click="cloud.login()">GitHub 登入</button>
        <button v-if="cloud.session" :disabled="cloud.busy" @click="cloud.logout()">登出</button>
        <button :disabled="!available || cloud.conflict" @click="upload">上傳本機存檔</button>
        <button :disabled="!available" @click="load">備份本機並載入雲端</button>
        <button :disabled="!cloud.session || !cloud.online || cloud.busy" @click="cloud.refresh()">重新讀取雲端狀態</button>
      </div>
      <div v-if="cloud.conflict" role="alert">
        <h3>選擇保留的進度</h3>
        <p>自動同步已暫停。本機進度保留，直到你明確選擇。</p>
        <div class="action-buttons">
          <button :disabled="!available" @click="load">備份本機，改用雲端</button>
          <button class="danger" :disabled="!available" @click="overwrite">確認以本機取代雲端</button>
        </div>
      </div>
      <p class="help-text">本機成功存檔後，每隔至少 5 分鐘同步一次；離線或版本衝突時保留本機進度。</p>
    </template>
  </section>
</template>
