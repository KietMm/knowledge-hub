import { countByLevel, getLevelBarClassName, getLevelLabel } from '@/lib/level'
import type { NoteLevel } from '@/lib/db/schema'

/**
 * Phân bố cấp độ của một lộ trình. Trả lời đúng một câu hỏi người học hỏi trước khi
 * bắt đầu: "công nghệ này có bao nhiêu phần dành cho người mới?".
 *
 * Thanh dùng `flex` với bề rộng theo phần trăm thay vì grid: số cấp độ có bài thay đổi
 * theo từng công nghệ, và cấp độ 0 bài phải biến mất hẳn chứ không để lại khoảng trống.
 */
export function LevelBar({ notes }: { notes: { level: NoteLevel }[] }) {
  const breakdown = countByLevel(notes)
  const total = notes.length
  if (total === 0) return null

  const present = breakdown.filter((item) => item.count > 0)

  return (
    <div className="space-y-1.5">
      <div
        className="flex h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={present
          .map((item) => `${getLevelLabel(item.level)}: ${item.count} bài`)
          .join(', ')}
      >
        {present.map((item) => (
          <div
            key={item.level}
            className={getLevelBarClassName(item.level)}
            style={{ width: `${(item.count / total) * 100}%` }}
          />
        ))}
      </div>
      <p className="font-mono text-[0.7rem] text-muted-foreground">
        {present.map((item) => `${getLevelLabel(item.level).toLowerCase()} ${item.count}`).join(' · ')}
      </p>
    </div>
  )
}
