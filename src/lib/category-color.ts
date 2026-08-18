/**
 * `Category.color` là dữ liệu tự do (nhập từ seed, sau này có thể từ form) nên phải
 * map qua bảng trắng cố định — giống cách `icons.ts` map tên icon. Tailwind v4 quét
 * class tĩnh trong source để sinh CSS; một chuỗi ghép động như `text-${color}-500`
 * không xuất hiện dưới dạng chữ trong source nên sẽ không được sinh ra, và class đó
 * biến mất khỏi bundle CSS lúc build dù đúng cú pháp lúc runtime.
 *
 * Mỗi mục là một "chip" nhỏ (nền nhạt + chữ/icon đậm màu) quanh icon của mảng, dùng ở
 * sidebar và ở thẻ mảng trên dashboard — accent có chủ đích, không đổi nền cả trang.
 *
 * Tương phản: sắc độ 600 trên nền 100 đạt ≥ 3:1 (ngưỡng WCAG 1.4.11 cho icon/thành phần
 * đồ hoạ, không phải chữ) với sky/emerald/rose. Riêng amber-600 trên amber-100 chỉ đạt
 * ~2.9:1 (nền vàng quá sáng so với vàng đậm 600) nên dùng amber-700 (~4.36:1) thay thế.
 * Ở theme tối dùng chữ sắc độ 400 trên chip nền 500/15 (nền tối pha trong suốt) — tổ hợp
 * quen thuộc của Tailwind, tương phản cao vì nền thực chất gần với nền tối của trang.
 */
const CATEGORY_COLOR_CLASSES: Record<string, string> = {
  sky: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400',
  emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  rose: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
}

/** Màu lạ (chưa có trong bảng trắng) rơi về trung tính, không vỡ giao diện. */
const DEFAULT_COLOR_CLASSES = 'bg-muted text-muted-foreground'

export function getCategoryColorClassName(color: string): string {
  return CATEGORY_COLOR_CLASSES[color] ?? DEFAULT_COLOR_CLASSES
}
