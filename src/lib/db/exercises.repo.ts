import { readCollection } from './json-store'
import { ExerciseSchema, type DoKho, type Exercise } from './schema'

/**
 * Kho bài tập. Chỉ có hàm ĐỌC: bài tập được sinh ra từ `content/bai-tap/` bằng
 * `pnpm content:build`, không có đường nào sửa từ giao diện — nên không có create/update
 * ở đây, và cũng không cần lo chế độ chỉ đọc.
 */

const FILE = 'exercises.json'

/** Dễ trước, khó sau; cùng độ khó thì theo thứ tự đặt trong tên file. */
const THU_TU_KHO: Record<DoKho, number> = { de: 0, 'trung-binh': 1, kho: 2 }

function theoDoKho(a: Exercise, b: Exercise): number {
  return THU_TU_KHO[a.doKho] - THU_TU_KHO[b.doKho] || a.order - b.order
}

export async function listAll(): Promise<Exercise[]> {
  return (await readCollection(FILE, ExerciseSchema)).sort(theoDoKho)
}

export async function findBySlug(slug: string): Promise<Exercise | null> {
  return (await readCollection(FILE, ExerciseSchema)).find((bt) => bt.slug === slug) ?? null
}

/**
 * Bài tập gắn với một bài học. Đây là chiều NGƯỢC của liên kết: file bài tập khai
 * `bai_hoc`, còn bài học không biết gì về bài tập — nhờ vậy không có gì để lệch khi
 * thêm bài tập mới.
 */
export async function listByBaiHoc(noteSlug: string): Promise<Exercise[]> {
  return (await listAll()).filter((bt) => bt.baiHoc === noteSlug)
}
