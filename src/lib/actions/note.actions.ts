'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { NotFoundError } from '@/lib/db/errors'
import * as notesRepo from '@/lib/db/notes.repo'
import { SlugSchema } from '@/lib/db/schema'
import * as topicsRepo from '@/lib/db/topics.repo'
import type { ActionResult } from './types'

/** Schema của form: dùng chung cho client (react-hook-form) và server (kiểm tra lại). */
export const NoteFormSchema = z.object({
  topicId: z.string().min(1, 'Hãy chọn công nghệ'),
  title: z.string().trim().min(1, 'Tiêu đề không được để trống'),
  slug: z.union([SlugSchema, z.literal('')]).optional(),
  summary: z.string().trim().max(300, 'Tóm tắt nên dưới 300 ký tự').default(''),
  content: z.string().default(''),
  tags: z.array(z.string().trim().min(1)).default([]),
})

export type NoteFormValues = z.infer<typeof NoteFormSchema>

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
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
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
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const { slug, ...rest } = parsed.data
    const note = await notesRepo.update(id, {
      ...rest,
      ...(slug === undefined || slug === '' ? {} : { slug }),
    })
    const topic = await topicsRepo.findById(note.topicId)
    revalidateAll(note.slug, topic?.slug)
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
