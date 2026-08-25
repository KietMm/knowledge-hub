import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as exercisesRepo from '@/lib/db/exercises.repo'
import type { DoKho } from '@/lib/db/schema'

let dir: string

/** Bài tập tối thiểu hợp lệ với schema — chỉ những trường test này quan tâm là khác nhau. */
function bt(slug: string, doKho: DoKho, order: number) {
  return {
    id: `bt-${slug}`,
    slug,
    title: slug,
    doKho,
    chuDe: ['mang'],
    ham: 'f',
    hamPy: 'f',
    soSanh: 'chinh-xac',
    deBai: 'đề',
    starter: { js: 'function f() {}', py: '' },
    boTest: [{ vao: [1], ra: 1 }],
    loiGiai: '',
    maLoiGiai: { js: '', py: '' },
    order,
  }
}

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kh-bt-repo-'))
  process.env.KH_DATA_DIR = dir
  // Cố tình ghi lộn xộn để chứng minh thứ tự do repo quyết định, không do thứ tự trong file.
  await fs.writeFile(
    path.join(dir, 'exercises.json'),
    JSON.stringify([bt('kho-1', 'kho', 1), bt('de-2', 'de', 2), bt('de-1', 'de', 1), bt('tb-1', 'trung-binh', 1)]),
    'utf8',
  )
})

afterEach(async () => {
  delete process.env.KH_DATA_DIR
  await fs.rm(dir, { recursive: true, force: true })
})

describe('exercisesRepo', () => {
  it('sắp xếp dễ → trung bình → khó, cùng độ khó thì theo thứ tự file', async () => {
    const ds = await exercisesRepo.listAll()
    expect(ds.map((x) => x.slug)).toEqual(['de-1', 'de-2', 'tb-1', 'kho-1'])
  })

  it('findNeighbors đi theo đúng thứ tự người học thấy ở /bt', async () => {
    // Đây là điểm chính: "bài tiếp theo" phải là bài đứng cạnh trong DANH SÁCH,
    // không phải bài kế tiếp trong file JSON.
    const giua = await exercisesRepo.findNeighbors('de-2')
    expect(giua.prev?.slug).toBe('de-1')
    expect(giua.next?.slug).toBe('tb-1')
    expect(giua.index).toBe(1)
    expect(giua.total).toBe(4)
  })

  it('bài đầu kho không có bài trước', async () => {
    const dau = await exercisesRepo.findNeighbors('de-1')
    expect(dau.prev).toBeNull()
    expect(dau.next?.slug).toBe('de-2')
    expect(dau.index).toBe(0)
  })

  it('bài cuối kho không có bài sau', async () => {
    const cuoi = await exercisesRepo.findNeighbors('kho-1')
    expect(cuoi.prev?.slug).toBe('tb-1')
    expect(cuoi.next).toBeNull()
    expect(cuoi.index).toBe(3)
  })

  it('slug không tồn tại: không hàng xóm, index -1, không ném lỗi', async () => {
    expect(await exercisesRepo.findNeighbors('khong-co')).toMatchObject({
      prev: null,
      next: null,
      index: -1,
    })
  })
})
