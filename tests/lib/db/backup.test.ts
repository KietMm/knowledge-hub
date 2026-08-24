import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { exportBundle, importBundle } from '@/lib/db/backup'
import * as notesRepo from '@/lib/db/notes.repo'
import { seedIfEmpty } from '@/lib/db/seed'

let dir: string

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kh-backup-'))
  process.env.KH_DATA_DIR = dir
})

afterEach(async () => {
  delete process.env.KH_DATA_DIR
  await fs.rm(dir, { recursive: true, force: true })
})

it('export rồi import lại cho ra đúng dữ liệu cũ', async () => {
  await seedIfEmpty()
  const bundle = await exportBundle()
  const before = await notesRepo.listAll()

  await notesRepo.remove(before[0]!.id) // làm dữ liệu lệch đi
  await importBundle(bundle)

  expect(await notesRepo.listAll()).toHaveLength(before.length)
})

it('bundle sai định dạng thì không ghi file nào', async () => {
  await seedIfEmpty()
  const before = await notesRepo.listAll()

  await expect(importBundle({ version: 1, notes: 'không phải mảng' })).rejects.toThrow()
  expect(await notesRepo.listAll()).toHaveLength(before.length)
})

it('một note sai schema cũng làm cả lần import bị từ chối', async () => {
  await seedIfEmpty()
  const bundle = await exportBundle()
  const broken = { ...bundle, notes: [...bundle.notes, { id: 'x' }] }

  await expect(importBundle(broken)).rejects.toThrow()
  expect(await notesRepo.listAll()).toHaveLength(bundle.notes.length)
})
