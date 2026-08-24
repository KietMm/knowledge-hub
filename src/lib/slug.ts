/**
 * Slug là khoá điều hướng trên URL nên phải ổn định và không dấu.
 * normalizeText được tách riêng vì search.ts cũng cần đúng phép chuẩn hoá này —
 * gõ "bat dong bo" phải tìm ra ghi chú tên "Bất đồng bộ".
 */

/** Bỏ dấu bằng NFD (tách dấu thành ký tự tổ hợp) rồi xoá dải Combining Diacritical Marks. */
export function normalizeText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // xoá dải Combining Diacritical Marks
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

export function slugify(input: string): string {
  const slug = normalizeText(input)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug === '' ? 'ghi-chu' : slug
}

/** Trả về base, hoặc base-2, base-3... cho tới khi không trùng với slug nào đang dùng. */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken)
  if (!used.has(base)) return base
  let n = 2
  while (used.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}
