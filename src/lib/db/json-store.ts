import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { z } from 'zod'

/**
 * Lớp lưu trữ thấp nhất: đọc/ghi một file JSON chứa một mảng bản ghi.
 *
 * Ba rủi ro được xử lý ngay từ đầu vì đây là chỗ dễ mất dữ liệu nhất:
 *  1. Ghi nửa chừng    -> ghi ra file .tmp rồi rename (rename là atomic trên cùng FS).
 *  2. Ghi chồng nhau   -> mọi mutate đi qua một promise queue trong process.
 *  3. File hỏng        -> throw DataFileError, tuyệt đối không ghi đè.
 */

export class DataFileError extends Error {
  constructor(
    readonly file: string,
    reason: string,
  ) {
    super(`Lỗi dữ liệu ở file "${file}": ${reason}`)
    this.name = 'DataFileError'
  }
}

/** Đọc mỗi lần gọi (không cache) để test có thể trỏ sang thư mục tạm. */
export function dataDir(): string {
  return process.env.KH_DATA_DIR ?? path.join(process.cwd(), 'data')
}

function fullPath(file: string): string {
  return path.join(dataDir(), file)
}

/** Hàng đợi ghi: các mutate nối đuôi nhau, lỗi của cái trước không chặn cái sau. */
let queue: Promise<unknown> = Promise.resolve()

function enqueue<R>(task: () => Promise<R>): Promise<R> {
  const run = queue.then(task, task)
  queue = run.catch(() => undefined)
  return run
}

async function writeAtomic(target: string, contents: string): Promise<void> {
  await fs.mkdir(path.dirname(target), { recursive: true })
  // Tên tạm duy nhất theo mỗi lượt gọi: hai lượt ghi cùng target (vd hai request
  // cùng gọi ensureSeeded() lúc khởi động) không được phép đụng chung một file .tmp.
  const tmp = `${target}.${process.pid}.${randomUUID()}.tmp`
  try {
    await fs.writeFile(tmp, contents, 'utf8')
    await fs.rename(tmp, target)
  } catch (error) {
    // Lỗi giữa chừng (rename thất bại, đĩa đầy, ...) không được để lại rác .tmp.
    await fs.rm(tmp, { force: true })
    throw error
  }
}

function serialize<T>(items: T[]): string {
  return `${JSON.stringify(items, null, 2)}\n`
}

// Input là `unknown`, không phải T: dữ liệu đọc từ file JSON là chưa biết kiểu,
// safeParse mới là nơi biến nó thành T. Đừng "sửa gọn" về z.ZodType<T> — với schema
// có trường .default() (vd NoteSchema), z.ZodType<T> ép Input=Output=T, khiến
// TypeScript suy nhầm T thành dạng Input (trường default hoá thành optional).
function validate<T>(file: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>, items: unknown): T[] {
  if (!Array.isArray(items)) {
    throw new DataFileError(file, 'nội dung phải là một mảng JSON')
  }
  const out: T[] = []
  for (const [index, raw] of items.entries()) {
    const parsed = schema.safeParse(raw)
    if (!parsed.success) {
      const detail = parsed.error.issues
        .map((i) => `${i.path.join('.') || '(gốc)'}: ${i.message}`)
        .join('; ')
      throw new DataFileError(file, `bản ghi thứ ${index + 1} không hợp lệ — ${detail}`)
    }
    out.push(parsed.data)
  }
  return out
}

// Input là `unknown` (xem giải thích ở validate() phía trên) — giữ nguyên khi sửa.
export async function readCollection<T>(
  file: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
): Promise<T[]> {
  let raw: string
  try {
    raw = await fs.readFile(fullPath(file), 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // File chưa có là trạng thái hợp lệ của app mới cài: tạo file rỗng.
      await writeAtomic(fullPath(file), '[]')
      return []
    }
    throw error
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    throw new DataFileError(file, `không parse được JSON (${(error as Error).message})`)
  }

  return validate(file, schema, parsed)
}

// Input là `unknown` (xem giải thích ở validate() phía trên) — giữ nguyên khi sửa.
export async function writeCollection<T>(
  file: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  items: T[],
): Promise<void> {
  // Validate TRƯỚC khi đụng vào file: sai schema thì file cũ còn nguyên.
  const validated = validate(file, schema, items)
  await writeAtomic(fullPath(file), serialize(validated))
}

/**
 * Đọc - biến đổi - ghi trong một lượt của hàng đợi. Đây là API duy nhất repo dùng
 * để thay đổi dữ liệu, nhờ vậy không có lost update giữa hai mutation song song.
 */
// Input là `unknown` (xem giải thích ở validate() phía trên) — giữ nguyên khi sửa.
export function mutate<T, R>(
  file: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  fn: (items: T[]) => { items: T[]; result: R },
): Promise<R> {
  return enqueue(async () => {
    const current = await readCollection(file, schema)
    const { items, result } = fn(current)
    await writeCollection(file, schema, items)
    return result
  })
}
