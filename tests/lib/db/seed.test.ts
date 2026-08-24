import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as categoriesRepo from '@/lib/db/categories.repo'
import * as notesRepo from '@/lib/db/notes.repo'
import { getLevelRank } from '@/lib/level'
import { SEED_CATEGORIES, SEED_NOTES, SEED_TOPICS } from '@/lib/db/seed-data'
import { seedIfEmpty } from '@/lib/db/seed'
import * as topicsRepo from '@/lib/db/topics.repo'

let dir: string

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kh-seed-'))
  process.env.KH_DATA_DIR = dir
})

afterEach(async () => {
  delete process.env.KH_DATA_DIR
  await fs.rm(dir, { recursive: true, force: true })
})

describe('tính toàn vẹn của dữ liệu seed', () => {
  it('mọi topic trỏ tới category có thật', () => {
    const ids = new Set(SEED_CATEGORIES.map((c) => c.id))
    for (const topic of SEED_TOPICS) expect(ids.has(topic.categoryId)).toBe(true)
  })

  it('mọi note trỏ tới topic có thật', () => {
    const ids = new Set(SEED_TOPICS.map((t) => t.id))
    for (const note of SEED_NOTES) expect(ids.has(note.topicId)).toBe(true)
  })

  it('slug không trùng trong từng loại', () => {
    for (const list of [SEED_CATEGORIES, SEED_TOPICS, SEED_NOTES]) {
      const slugs = list.map((x) => x.slug)
      expect(new Set(slugs).size).toBe(slugs.length)
    }
  })

  it('id không trùng trong từng loại', () => {
    for (const list of [SEED_CATEGORIES, SEED_TOPICS, SEED_NOTES]) {
      const ids = list.map((x) => x.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('mỗi ghi chú có tóm tắt, tag, nội dung thật và ít nhất một code block', () => {
    for (const note of SEED_NOTES) {
      expect(note.summary.length, `thiếu tóm tắt: ${note.slug}`).toBeGreaterThan(20)
      expect(note.tags.length, `thiếu tag: ${note.slug}`).toBeGreaterThan(0)
      expect(note.content.length, `nội dung quá ngắn: ${note.slug}`).toBeGreaterThan(400)
      expect(note.content, `thiếu code mẫu: ${note.slug}`).toContain('```')
    }
  })

  it('mọi công nghệ đều có bài học, không công nghệ nào rỗng', () => {
    // Không khẳng định một con số tổng cố định: giáo trình còn được bổ sung, và một
    // con số cứng sẽ hỏng ở mỗi lần thêm bài mà không nói lên điều gì về chất lượng.
    // Điều đáng bảo vệ là: không có công nghệ nào rỗng trơn khi mở ra.
    const soBai = new Map<string, number>()
    for (const note of SEED_NOTES) {
      soBai.set(note.topicId, (soBai.get(note.topicId) ?? 0) + 1)
    }
    for (const topic of SEED_TOPICS) {
      expect(soBai.get(topic.id) ?? 0, `công nghệ rỗng: ${topic.slug}`).toBeGreaterThanOrEqual(3)
    }
  })

  it('thứ tự bài trong mỗi công nghệ liền mạch từ 1', () => {
    // Lỗ trong thứ tự (1,2,4) nghĩa là một file bài học bị xoá mà không đánh số lại —
    // người học sẽ thấy "Bài 3/8" nhảy sang "Bài 5/8" ở phần điều hướng.
    for (const topic of SEED_TOPICS) {
      const orders = SEED_NOTES.filter((n) => n.topicId === topic.id)
        .map((n) => n.order)
        .sort((a, b) => a - b)
      expect(orders, `thứ tự không liền mạch: ${topic.slug}`).toEqual(
        orders.map((_, index) => index + 1),
      )
    }
  })

  it('độ khó trong mỗi công nghệ tăng dần, không nhảy ngược', () => {
    // Đây là ràng buộc làm nên "lộ trình": một bài cơ bản nằm sau bài nâng cao nghĩa
    // là thứ tự sai, chứ không phải một cách trình bày khác. Không đòi bài đầu phải
    // luôn là cơ bản — có công nghệ (vd triển khai) mặc định giả thiết người đọc đã
    // qua phần nền tảng ở công nghệ khác.
    for (const topic of SEED_TOPICS) {
      const ranks = SEED_NOTES.filter((n) => n.topicId === topic.id)
        .sort((a, b) => a.order - b.order)
        .map((n) => getLevelRank(n.level))
      for (let i = 1; i < ranks.length; i += 1) {
        expect(
          ranks[i] ?? 0,
          `${topic.slug}: bài ${i + 1} dễ hơn bài ${i} (${ranks.join(',')})`,
        ).toBeGreaterThanOrEqual(ranks[i - 1] ?? 0)
      }
    }
  })
})

describe('seedIfEmpty', () => {
  it('nạp dữ liệu khi data còn rỗng', async () => {
    expect(await seedIfEmpty()).toEqual({ seeded: true })
    expect(await categoriesRepo.listAll()).toHaveLength(SEED_CATEGORIES.length)
    expect(await topicsRepo.listAll()).toHaveLength(SEED_TOPICS.length)
    expect(await notesRepo.listAll()).toHaveLength(SEED_NOTES.length)
  })

  it('không ghi đè khi đã có dữ liệu', async () => {
    await notesRepo.create({ topicId: 't1', title: 'Ghi chú của tôi', summary: '', content: '' })
    expect(await seedIfEmpty()).toEqual({ seeded: false })
    const notes = await notesRepo.listAll()
    expect(notes).toHaveLength(1)
    expect(notes[0]?.title).toBe('Ghi chú của tôi')
  })
})

describe('ensureSeeded', () => {
  // Mỗi test import lại module 'seed' từ đầu (vi.resetModules) để singleton nội bộ
  // seedOnce không rò rỉ giữa các test — mô phỏng đúng "một tiến trình mới".
  beforeEach(() => {
    vi.resetModules()
  })

  it('không nhớ lỗi: sửa file hỏng xong, gọi lại phải seed thật chứ không trả lỗi cũ', async () => {
    // File JSON hỏng (không parse được) khiến readCollection ném DataFileError —
    // đây là kịch bản spec §8 mô tả và cũng là kịch bản I1 nêu ra.
    await fs.writeFile(path.join(dir, 'categories.json'), '{ đây không phải JSON hợp lệ', 'utf8')

    const { ensureSeeded } = await import('@/lib/db/seed')

    await expect(ensureSeeded()).rejects.toThrow(/không parse được JSON/)

    // "Sửa file" — ghi lại một mảng rỗng hợp lệ để các collection còn lại (topics,
    // notes) cũng đang rỗng, cho phép seedIfEmpty() chạy thật ở lần gọi kế tiếp.
    await fs.writeFile(path.join(dir, 'categories.json'), '[]', 'utf8')

    await expect(ensureSeeded()).resolves.toBeUndefined()
    expect(await categoriesRepo.listAll()).toHaveLength(SEED_CATEGORIES.length)
    expect(await topicsRepo.listAll()).toHaveLength(SEED_TOPICS.length)
    expect(await notesRepo.listAll()).toHaveLength(SEED_NOTES.length)
  })

  it('trong điều kiện bình thường, gọi nhiều lần chỉ seed một lần (memo hoá thành công)', async () => {
    const { ensureSeeded } = await import('@/lib/db/seed')

    await ensureSeeded()
    await notesRepo.create({ topicId: 't1', title: 'Ghi tay sau khi đã seed', summary: '', content: '' })

    // Lần gọi thứ hai không được chạy lại seedIfEmpty() (nó sẽ no-op vì data không rỗng
    // nên khó phân biệt trực tiếp) — kiểm tra gián tiếp bằng cách chắc chắn promise trả
    // về vẫn resolve và không tạo lại dữ liệu seed đè lên ghi chú vừa tạo tay.
    await ensureSeeded()
    const notes = await notesRepo.listAll()
    expect(notes.some((n) => n.title === 'Ghi tay sau khi đã seed')).toBe(true)
  })
})
