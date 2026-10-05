/** One document owns the origin's checkpoint until disposal or document destruction.
 * No automatic takeover: a losing page must reload and read the current save.
 */
export function holdSaveWriter(acquired: () => void, blocked: (message: string) => void) {
  let disposed = false, release = () => {}
  const unavailable = '此瀏覽器無法安全協調遊戲存檔，已停止操作。請以支援 Web Locks 的瀏覽器透過 HTTPS 或 localhost 開啟。'
  if (typeof navigator === 'undefined' || !navigator.locks) blocked(unavailable)
  else {
    void navigator.locks.request('oakvale-v1:writer', { ifAvailable: true }, lock => {
      if (disposed) return
      if (!lock) { blocked('另一個遊戲頁面正在使用此存檔，此頁已停止操作。請先關閉其他遊戲頁面，再重新整理此頁以讀取最新進度。'); return }
      return new Promise<void>(resolve => { release = resolve; acquired() })
    }).catch(() => { if (!disposed) blocked(unavailable) })
  }
  return () => { disposed = true; release() }
}
