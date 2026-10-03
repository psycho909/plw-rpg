<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{ title: string; dismissible?: boolean }>(), { dismissible: true })
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()
let trigger: HTMLElement | null = null
function containFocus(event: KeyboardEvent) {
  if (event.key !== 'Tab' || event.ctrlKey || event.metaKey || event.altKey) return
  const controls = Array.from(dialog.value?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]') ?? []).filter(el => el.tabIndex >= 0 && el.getClientRects().length)
  event.preventDefault()
  const index = controls.indexOf(document.activeElement as HTMLElement)
  const next = event.shiftKey ? (index <= 0 ? controls.length - 1 : index - 1) : (index + 1) % controls.length
  ;(controls[next] ?? dialog.value)?.focus()
}
async function focusContent() {
  await nextTick()
  const target = dialog.value?.querySelector<HTMLElement>('[data-autofocus], .window-body button:not(:disabled)')
  ;(target ?? dialog.value)?.focus()
}
onMounted(() => {
  trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
  dialog.value?.showModal()
  void focusContent()
})
watch(() => props.title, focusContent)
onUnmounted(() => {
  dialog.value?.close()
  if (trigger?.isConnected && !trigger.closest('dialog')) trigger.focus()
  else document.querySelector<HTMLElement>('.world-map:not(.overview-map)')?.focus()
})
</script>

<template>
  <dialog ref="dialog" class="pixel-window" aria-labelledby="window-title" tabindex="-1" @keydown="containFocus" @cancel.prevent="dismissible && emit('close')">
    <header class="window-heading">
      <h2 id="window-title"><span aria-hidden="true">┤</span> {{ title }} <span aria-hidden="true">├</span></h2>
      <button v-if="dismissible" class="window-close" aria-label="關閉視窗" @click="emit('close')">× <kbd>Esc</kbd></button>
    </header>
    <div class="window-body" tabindex="0" aria-label="視窗內容，可捲動"><slot /></div>
    <footer class="window-footer"><slot name="footer" /></footer>
  </dialog>
</template>
