import { z } from 'zod'

/**
 * Đây là nguồn sự thật duy nhất của mô hình dữ liệu.
 * - Entity type (Category, Topic, Note) dùng z.infer: kiểu ĐẦU RA sau khi parse.
 * - Input type (*CreateInput, *UpdateInput) dùng z.input: kiểu ĐẦU VÀO, trường có .default() là tuỳ chọn với người gọi.
 */

/** Slug là khoá điều hướng trên URL: chỉ chữ thường, số, và dấu gạch nối ở giữa. */
export const SlugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường, số và dấu gạch nối')

/** Chuỗi thời gian ISO 8601. Tự viết refine thay vì .datetime() để không phụ thuộc phiên bản zod. */
export const IsoDateSchema = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)) && v.includes('T'), 'Thời gian phải ở dạng ISO 8601')

export const CategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, 'Tên danh mục không được để trống'),
  slug: SlugSchema,
  description: z.string().default(''),
  icon: z.string().min(1, 'Biểu tượng không được để trống'),
  color: z.string().min(1, 'Màu sắc không được để trống'),
  order: z.number().int().nonnegative('Thứ tự phải là số không âm'),
})

export const TopicSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().min(1),
  name: z.string().trim().min(1, 'Tên chủ đề không được để trống'),
  slug: SlugSchema,
  description: z.string().default(''),
  order: z.number().int().nonnegative('Thứ tự phải là số không âm'),
})

/**
 * Cấp độ của bài học. Là enum (không phải chuỗi tự do) vì giao diện tô màu và lọc
 * theo giá trị này — một giá trị lạ sẽ rơi ra ngoài mọi nhánh render.
 */
export const NoteLevelSchema = z.enum(['co-ban', 'trung-cap', 'nang-cao'])
export type NoteLevel = z.infer<typeof NoteLevelSchema>

export const NoteSchema = z.object({
  id: z.string().min(1),
  topicId: z.string().min(1),
  title: z.string().trim().min(1, 'Tiêu đề không được để trống'),
  slug: SlugSchema,
  summary: z.string().trim().default(''),
  content: z.string().default(''),
  tags: z.array(z.string().trim().min(1, 'Thẻ không được để trống')).default([]),
  /**
   * Vị trí trong lộ trình học của công nghệ. Có .default() nên dữ liệu cũ (ghi trước
   * khi có trường này) vẫn parse được — không cần migration thủ công.
   */
  order: z.number().int().nonnegative('Thứ tự phải là số không âm').default(0),
  level: NoteLevelSchema.default('co-ban'),
  starred: z.boolean().default(false),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
})

export type Category = z.infer<typeof CategorySchema>
export type Topic = z.infer<typeof TopicSchema>
export type Note = z.infer<typeof NoteSchema>

/**
 * Input khi tạo: repo tự sinh id/createdAt/updatedAt, và tự sinh slug từ tiêu đề
 * nếu người dùng không nhập slug.
 */
export const NoteCreateSchema = NoteSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  slug: true,
  order: true,
}).extend({
  slug: SlugSchema.optional(),
  /** Bỏ trống thì repo tự xếp vào cuối lộ trình của công nghệ đang chọn. */
  order: z.number().int().nonnegative().optional(),
})

/** Input khi sửa: mọi trường đều tuỳ chọn; không cho sửa id/timestamp từ ngoài. */
export const NoteUpdateSchema = NoteCreateSchema.partial()

export const CategoryCreateSchema = CategorySchema.omit({ id: true, slug: true }).extend({
  slug: SlugSchema.optional(),
})
export const TopicCreateSchema = TopicSchema.omit({ id: true, slug: true }).extend({
  slug: SlugSchema.optional(),
})

/**
 * Dùng z.input (không phải z.infer): trường có .default() là TUỲ CHỌN với người gọi,
 * và chỉ chắc chắn có giá trị sau khi schema.parse() chạy bên trong repo.
 */
export type NoteCreateInput = z.input<typeof NoteCreateSchema>
export type NoteUpdateInput = z.input<typeof NoteUpdateSchema>
export type CategoryCreateInput = z.input<typeof CategoryCreateSchema>
export type TopicCreateInput = z.input<typeof TopicCreateSchema>

/** Định dạng file backup của /api/export và /api/import. */
export const ExportBundleSchema = z.object({
  version: z.literal(1),
  exportedAt: IsoDateSchema,
  categories: z.array(CategorySchema),
  topics: z.array(TopicSchema),
  notes: z.array(NoteSchema),
})
export type ExportBundle = z.infer<typeof ExportBundleSchema>
