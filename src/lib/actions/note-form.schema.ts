import { z } from 'zod'
import { NoteLevelSchema, SlugSchema } from '@/lib/db/schema'

/**
 * Schema của form: dùng chung cho client (react-hook-form) và server (kiểm tra lại).
 *
 * Tách riêng khỏi note.actions.ts (file có 'use server') vì một file 'use server'
 * chỉ được phép export async function — export một z.object(...) (một giá trị,
 * không phải hàm) từ đó và import thẳng vào Client Component là sai ranh giới
 * server/client của Next.js. File này KHÔNG có 'use server' nên import được ở cả
 * hai phía.
 */
export const NoteFormSchema = z.object({
  topicId: z.string().min(1, 'Hãy chọn công nghệ'),
  title: z.string().trim().min(1, 'Tiêu đề không được để trống'),
  slug: z.union([SlugSchema, z.literal('')]).optional(),
  summary: z.string().trim().max(300, 'Tóm tắt nên dưới 300 ký tự').default(''),
  content: z.string().default(''),
  tags: z.array(z.string().trim().min(1)).default([]),
  level: NoteLevelSchema.default('co-ban'),
})

export type NoteFormValues = z.infer<typeof NoteFormSchema>

/**
 * Type guard tránh phải ép kiểu (`as keyof NoteFormValues`) khi map fieldErrors
 * (key kiểu string, đến từ zod .flatten()) sang field của react-hook-form: kiểm
 * tra trực tiếp trên object shape thật của schema, luôn khớp tự động khi schema đổi.
 */
export function isNoteFormField(field: string): field is keyof NoteFormValues {
  return field in NoteFormSchema.shape
}
