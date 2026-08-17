import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { DataFileError, mutate, readCollection, writeCollection } from '@/lib/db/json-store'

const ItemSchema = z.object({ id: z.string(), n: z.number() })
type Item = z.infer<typeof ItemSchema>

let dir: string

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kh-test-'))
  process.env.KH_DATA_DIR = dir
})

afterEach(async () => {
  delete process.env.KH_DATA_DIR
  await fs.rm(dir, { recursive: true, force: true })
})

describe('readCollection', () => {
  it('file chưa tồn tại thì tạo file rỗng và trả mảng rỗng', async () => {
    const items = await readCollection('items.json', ItemSchema)
    expect(items).toEqual([])
    expect(await fs.readFile(path.join(dir, 'items.json'), 'utf8')).toBe('[]')
  })

  it('đọc lại đúng dữ liệu đã ghi', async () => {
    await writeCollection('items.json', ItemSchema, [{ id: 'a', n: 1 }])
    expect(await readCollection('items.json', ItemSchema)).toEqual([{ id: 'a', n: 1 }])
  })

  it('JSON hỏng thì throw DataFileError và KHÔNG ghi đè file', async () => {
    const file = path.join(dir, 'items.json')
    await fs.writeFile(file, '{ hỏng')
    await expect(readCollection('items.json', ItemSchema)).rejects.toBeInstanceOf(DataFileError)
    expect(await fs.readFile(file, 'utf8')).toBe('{ hỏng')
  })

  it('dữ liệu sai schema thì throw DataFileError kèm tên file', async () => {
    await fs.writeFile(path.join(dir, 'items.json'), JSON.stringify([{ id: 'a', n: 'sai' }]))
    await expect(readCollection('items.json', ItemSchema)).rejects.toThrow(/items\.json/)
  })
})

describe('writeCollection', () => {
  it('không để lại file .tmp sau khi ghi xong', async () => {
    await writeCollection('items.json', ItemSchema, [{ id: 'a', n: 1 }])
    const files = await fs.readdir(dir)
    expect(files.some((f) => f.endsWith('.tmp'))).toBe(false)
  })

  it('từ chối ghi dữ liệu sai schema và giữ nguyên file cũ', async () => {
    await writeCollection('items.json', ItemSchema, [{ id: 'a', n: 1 }])
    const bad = [{ id: 'b' }] as unknown as Item[]
    await expect(writeCollection('items.json', ItemSchema, bad)).rejects.toBeInstanceOf(DataFileError)
    expect(await readCollection('items.json', ItemSchema)).toEqual([{ id: 'a', n: 1 }])
  })

  it('dọn file .tmp mồ côi khi rename thất bại giữa chừng', async () => {
    await writeCollection('items.json', ItemSchema, [{ id: 'a', n: 1 }])
    const renameSpy = vi.spyOn(fs, 'rename').mockRejectedValueOnce(new Error('rename thất bại (giả lập)'))

    await expect(writeCollection('items.json', ItemSchema, [{ id: 'b', n: 2 }])).rejects.toThrow(
      'rename thất bại (giả lập)',
    )
    renameSpy.mockRestore()

    const files = await fs.readdir(dir)
    expect(files.some((f) => f.endsWith('.tmp'))).toBe(false)
    expect(await readCollection('items.json', ItemSchema)).toEqual([{ id: 'a', n: 1 }])
  })
})

describe('mutate', () => {
  it('trả về result của hàm biến đổi', async () => {
    const created = await mutate('items.json', ItemSchema, (items) => {
      const item: Item = { id: 'a', n: 1 }
      return { items: [...items, item], result: item }
    })
    expect(created).toEqual({ id: 'a', n: 1 })
  })

  it('hai lần ghi đồng thời không mất update', async () => {
    await writeCollection('items.json', ItemSchema, [])
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        mutate('items.json', ItemSchema, (items) => ({
          items: [...items, { id: `id-${i}`, n: i }],
          result: null,
        })),
      ),
    )
    const items = await readCollection('items.json', ItemSchema)
    expect(items).toHaveLength(20)
    expect(new Set(items.map((i) => i.id)).size).toBe(20)
  })

  it('hàm biến đổi throw thì file không đổi và hàng đợi vẫn chạy tiếp', async () => {
    await writeCollection('items.json', ItemSchema, [{ id: 'a', n: 1 }])
    await expect(
      mutate('items.json', ItemSchema, () => {
        throw new Error('lỗi nghiệp vụ')
      }),
    ).rejects.toThrow('lỗi nghiệp vụ')

    await mutate('items.json', ItemSchema, (items) => ({
      items: [...items, { id: 'b', n: 2 }],
      result: null,
    }))
    expect(await readCollection('items.json', ItemSchema)).toHaveLength(2)
  })
})
