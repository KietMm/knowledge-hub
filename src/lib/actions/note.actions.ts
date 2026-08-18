'use server'

import { revalidatePath } from 'next/cache'
import { NotFoundError } from '@/lib/db/errors'
import * as notesRepo from '@/lib/db/notes.repo'
import * as topicsRepo from '@/lib/db/topics.repo'
import { NoteFormSchema } from './note-form.schema'
import type { ActionResult } from './types'

function fail(error: unknown): ActionResult<never> {
  if (error instanceof NotFoundError) return { ok: false, error: error.message }
  return {
    ok: false,
    error: error instanceof Error ? error.message : 'Có lỗi không xác định khi lưu dữ liệu',
  }
}

/** Sau mỗi thay đổi, làm mới cache của mọi trang có thể đang hiển thị ghi chú đó. */
function revalidateAll(slug?: string, topicSlug?: string): void {
  revalidatePath('/')
  revalidatePath('/c/[category]', 'page')
  if (topicSlug !== undefined) revalidatePath(`/t/${topicSlug}`)
  if (slug !== undefined) revalidatePath(`/n/${slug}`)
}

export async function createNoteAction(input: unknown): Promise<ActionResult<{ slug: string }>> {
  const parsed = NoteFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Dữ liệu chưa hợp lệ',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  try {
    const { slug, ...rest } = parsed.data
    const note = await notesRepo.create({
      ...rest,
      starred: false,
      ...(slug === undefined || slug === '' ? {} : { slug }),
    })
    const topic = await topicsRepo.findById(note.topicId)
    revalidateAll(note.slug, topic?.slug)
    return { ok: true, data: { slug: note.slug } }
  } catch (error) {
    return fail(error)
  }
}

export async function updateNoteAction(
  id: string,
  input: unknown,
): Promise<ActionResult<{ slug: string }>> {
  const parsed = NoteFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Dữ liệu chưa hợp lệ',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  try {
    // Đọc ghi chú TRƯỚC khi sửa để biết topic cũ: nếu người dùng đổi Công nghệ
    // trong form, trang /t/{topic-cũ} vẫn còn cache ghi chú này nếu không revalidate.
    const before = await notesRepo.findById(id)
    if (before === null) throw new NotFoundError(`ghi chú "${id}"`)
    const oldTopic = await topicsRepo.findById(before.topicId)

    const { slug, ...rest } = parsed.data
    const note = await notesRepo.update(id, {
      ...rest,
      ...(slug === undefined || slug === '' ? {} : { slug }),
    })

    const newTopic = await topicsRepo.findById(note.topicId)
    revalidateAll(note.slug, newTopic?.slug)
    if (oldTopic !== null && oldTopic.id !== newTopic?.id) revalidatePath(`/t/${oldTopic.slug}`)

    return { ok: true, data: { slug: note.slug } }
  } catch (error) {
    return fail(error)
  }
}

export async function deleteNoteAction(id: string): Promise<ActionResult<{ topicSlug: string }>> {
  try {
    const note = await notesRepo.findById(id)
    if (note === null) throw new NotFoundError(`ghi chú "${id}"`)
    const topic = await topicsRepo.findById(note.topicId)
    await notesRepo.remove(id)
    revalidateAll(note.slug, topic?.slug)
    return { ok: true, data: { topicSlug: topic?.slug ?? '' } }
  } catch (error) {
    return fail(error)
  }
}

export async function toggleStarAction(id: string): Promise<ActionResult<{ starred: boolean }>> {
  try {
    const note = await notesRepo.toggleStar(id)
    const topic = await topicsRepo.findById(note.topicId)
    revalidateAll(note.slug, topic?.slug)
    return { ok: true, data: { starred: note.starred } }
  } catch (error) {
    return fail(error)
  }
}
