import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { GET } from '@/app/api/search/route'
import * as notesRepo from '@/lib/db/notes.repo'
import * as topicsRepo from '@/lib/db/topics.repo'

/**
 * ⌘K gọi route này cho mỗi lần gõ, nên hai điều phải chắc: truy vấn rỗng không đụng tới
 * dữ liệu, và kết quả trả về KHÔNG mang theo `content`. Trước đây cả giáo trình được nhét
 * vào props của layout và mọi trang nặng hơn một megabyte vì thế — test này là cái chốt
 * để không vô tình quay lại chỗ cũ.
 */

let dir: string

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kh-search-'))
  process.env.KH_DATA_DIR = dir
  const topic = await topicsRepo.create({ categoryId: 'c1', name: 'Docker', description: '', order: 0 })
  await notesRepo.create({
    topicId: topic.id,
    title: 'Viết Dockerfile',
    summary: 'Cách viết Dockerfile gọn',
    content: 'NOI-DUNG-RAT-DAI-KHONG-DUOC-TRA-VE',
  })
})

afterEach(async () => {
  delete process.env.KH_DATA_DIR
  await fs.rm(dir, { recursive: true, force: true })
})

async function goi(q: string): Promise<{ results: { title: string; href: string }[] }> {
  const res = await GET(new Request(`http://localhost/api/search?q=${encodeURIComponent(q)}`))
  return res.json()
}

describe('GET /api/search', () => {
  it('tìm được theo tiêu đề và trả về href điều hướng', async () => {
    const { results } = await goi('dockerfile')
    expect(results[0]).toMatchObject({ title: 'Viết Dockerfile', href: '/n/viet-dockerfile' })
  })

  it('không trả về nội dung bài học', async () => {
    const { results } = await goi('dockerfile')
    expect(JSON.stringify(results)).not.toContain('NOI-DUNG-RAT-DAI')
  })

  it('vẫn tìm được khi từ khoá nằm trong thân bài', async () => {
    // Bỏ content khỏi KẾT QUẢ không được làm mất khả năng tìm TRONG content.
    const { results } = await goi('noi-dung-rat-dai')
    expect(results).toHaveLength(1)
  })

  it('truy vấn rỗng trả mảng rỗng', async () => {
    expect((await goi('')).results).toEqual([])
    expect((await goi('   ')).results).toEqual([])
  })

  it('không có kết quả thì trả mảng rỗng, không lỗi', async () => {
    expect((await goi('khong-co-gi-khop-ca')).results).toEqual([])
  })
})
