export const MODAL_FOCUSABLE_SELECTOR = [
  'button:not(:disabled)',
  'details > summary',
  'a[href]',
  'input:not(:disabled):not([type="hidden"])',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[tabindex]',
  '[contenteditable]:not([contenteditable="false"])',
].join(', ')

export function orderModalFocusables<T extends { tabIndex: number }>(
  candidates: readonly T[],
  isVisible: (candidate: T) => boolean,
): T[] {
  return candidates.map((element, domOrder) => ({ element, domOrder }))
    .filter(({ element }) => {
      const control = element as T & { disabled?: boolean; matches?: (selector: string) => boolean; getAttribute?: (name: string) => string | null }
      // Honor native disabled state and ARIA's explicit disabled semantics for generic tabindex matches.
      const disabled = control.disabled === true
        || control.matches?.(':disabled') === true
        || control.getAttribute?.('aria-disabled')?.toLowerCase() === 'true'
      return element.tabIndex >= 0 && !disabled && isVisible(element)
    })
    .sort((a, b) => {
      if (a.element.tabIndex === 0) return b.element.tabIndex === 0 ? a.domOrder - b.domOrder : 1
      if (b.element.tabIndex === 0) return -1
      return a.element.tabIndex - b.element.tabIndex || a.domOrder - b.domOrder
    })
    .map(({ element }) => element)
}

export function nextModalFocusable<T>(controls: readonly T[], active: T | null, backwards: boolean): T | null {
  if (!controls.length) return null
  const index = active === null ? -1 : controls.indexOf(active)
  const next = backwards
    ? (index <= 0 ? controls.length - 1 : index - 1)
    : (index + 1) % controls.length
  return controls[next] ?? null
}
