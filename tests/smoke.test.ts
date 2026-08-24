import { describe, expect, it } from 'vitest'

describe('bộ test', () => {
  it('chạy được và alias @/ hoạt động', async () => {
    const mod = await import('@/lib/version')
    expect(mod.APP_NAME).toBe('Knowledge Hub')
  })
})
