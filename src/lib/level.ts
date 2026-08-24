import type { NoteLevel } from '@/lib/db/schema'

/**
 * Cấp độ bài học: nhãn tiếng Việt, thứ tự tăng dần, và class màu.
 *
 * Cùng lý do với `category-color.ts`: Tailwind quét class dạng chữ trong source nên
 * class phải nằm trọn vẹn ở đây, không ghép động từ tên cấp độ.
 */

export const NOTE_LEVELS = ['co-ban', 'trung-cap', 'nang-cao'] as const

const LEVEL_META: Record<
  NoteLevel,
  { label: string; short: string; className: string; barClassName: string }
> = {
  'co-ban': {
    label: 'Cơ bản',
    short: '1',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    barClassName: 'bg-emerald-500',
  },
  'trung-cap': {
    label: 'Trung cấp',
    short: '2',
    className: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    barClassName: 'bg-sky-500',
  },
  'nang-cao': {
    label: 'Nâng cao',
    short: '3',
    className: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    barClassName: 'bg-violet-500',
  },
}

export function getLevelLabel(level: NoteLevel): string {
  return LEVEL_META[level].label
}

export function getLevelClassName(level: NoteLevel): string {
  return LEVEL_META[level].className
}

/** Màu đặc cho thanh phân bố cấp độ — nền nhạt của badge quá mờ ở thanh 6px. */
export function getLevelBarClassName(level: NoteLevel): string {
  return LEVEL_META[level].barClassName
}

/** Số thứ tự cấp độ (0,1,2) — dùng để sắp xếp và để vẽ thanh 3 vạch. */
export function getLevelRank(level: NoteLevel): number {
  const index = NOTE_LEVELS.indexOf(level)
  return index === -1 ? 0 : index
}

export type LevelBreakdown = { level: NoteLevel; count: number }

/**
 * Đếm số bài theo từng cấp độ, luôn trả về đủ ba mục theo đúng thứ tự tăng dần
 * (kể cả cấp độ có 0 bài) để giao diện vẽ được thanh phân bố có bề rộng ổn định.
 */
export function countByLevel(items: { level: NoteLevel }[]): LevelBreakdown[] {
  return NOTE_LEVELS.map((level) => ({
    level,
    count: items.filter((item) => item.level === level).length,
  }))
}
