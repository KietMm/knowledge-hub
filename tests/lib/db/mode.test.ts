import { afterEach, describe, expect, it } from 'vitest'
import { ReadOnlyError, laReadOnly } from '@/lib/db/mode'

const goc = { KH_READONLY: process.env.KH_READONLY, VERCEL: process.env.VERCEL }

afterEach(() => {
  process.env.KH_READONLY = goc.KH_READONLY
  process.env.VERCEL = goc.VERCEL
})

describe('laReadOnly', () => {
  it('mặc định ở máy cá nhân là ghi được', () => {
    delete process.env.KH_READONLY
    delete process.env.VERCEL
    expect(laReadOnly()).toBe(false)
  })

  it('tự bật khi chạy trên Vercel', () => {
    delete process.env.KH_READONLY
    process.env.VERCEL = '1'
    expect(laReadOnly()).toBe(true)
  })

  it('KH_READONLY=0 thắng cả khi đang trên Vercel', () => {
    process.env.VERCEL = '1'
    process.env.KH_READONLY = '0'
    expect(laReadOnly()).toBe(false)
  })

  it('KH_READONLY=1 bật được ở máy cá nhân để thử', () => {
    delete process.env.VERCEL
    process.env.KH_READONLY = '1'
    expect(laReadOnly()).toBe(true)
  })

  it('lỗi nói rõ vì sao và phải làm gì', () => {
    const loi = new ReadOnlyError('Xoá bài học')
    expect(loi.message).toContain('Xoá bài học')
    expect(loi.message).toContain('máy cá nhân')
    expect(loi.name).toBe('ReadOnlyError')
  })
})
