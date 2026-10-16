import { describe, expect, it } from 'vitest'
import { craftSuccessMessage } from './craftingFeedback'

describe('craftSuccessMessage', () => {
  it('includes the actual smithing practice award after a successful craft', () => {
    expect(craftSuccessMessage('木石長矛', false, 10)).toBe('製作完成：木石長矛。 鍛造熟練 +10。')
  })

  it('keeps masterpiece wording and omits practice when the plan awards none', () => {
    expect(craftSuccessMessage('木石長矛', true, 0)).toBe('鍛造傑作完成：木石長矛。')
  })
})
