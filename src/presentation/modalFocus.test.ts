import { describe, expect, it } from 'vitest'
import { MODAL_FOCUSABLE_SELECTOR, nextModalFocusable, orderModalFocusables } from './modalFocus'

describe('modal focus handling', () => {
  it('includes disclosure summaries alongside native controls', () => {
    expect(MODAL_FOCUSABLE_SELECTOR).toContain('details > summary')
    expect(MODAL_FOCUSABLE_SELECTOR).toContain('button:not(:disabled)')
  })

  it('orders positive tabindex first, preserves DOM order for ties, and skips hidden or negative controls', () => {
    const controls = [
      { name: 'first-dom', tabIndex: 0, visible: true },
      { name: 'second-positive', tabIndex: 2, visible: true },
      { name: 'first-positive', tabIndex: 1, visible: true },
      { name: 'same-positive', tabIndex: 1, visible: true },
      { name: 'hidden', tabIndex: 0, visible: false },
      { name: 'negative', tabIndex: -1, visible: true },
    ]

    expect(orderModalFocusables(controls, control => control.visible).map(control => control.name))
      .toEqual(['first-positive', 'same-positive', 'second-positive', 'first-dom'])
  })

  it('excludes a visible disabled control with nonnegative tabindex from the Tab sequence', () => {
    const controls = [
      { name: 'enabled', tabIndex: 0, visible: true, disabled: false },
      { name: 'disabled-native-control', tabIndex: 0, visible: true, disabled: true },
      { name: 'disabled-aria-control', tabIndex: 0, visible: true, getAttribute: (name: string) => name === 'aria-disabled' ? 'true' : null },
    ]

    expect(orderModalFocusables(controls, control => control.visible).map(control => control.name))
      .toEqual(['enabled'])
  })

  it('wraps in both directions and recovers when focus is outside the controls', () => {
    const controls = ['first', 'second', 'third']
    expect(nextModalFocusable(controls, 'third', false)).toBe('first')
    expect(nextModalFocusable(controls, 'first', true)).toBe('third')
    expect(nextModalFocusable(controls, null, false)).toBe('first')
    expect(nextModalFocusable(controls, null, true)).toBe('third')
    expect(nextModalFocusable([], null, false)).toBeNull()
  })
})
