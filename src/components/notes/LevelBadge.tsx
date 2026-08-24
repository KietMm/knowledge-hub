import type { NoteLevel } from '@/lib/db/schema'
import { getLevelClassName, getLevelLabel } from '@/lib/level'
import { cn } from '@/lib/utils'

export function LevelBadge({ level, className }: { level: NoteLevel; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-mono text-[0.7rem] font-medium tracking-wide',
        getLevelClassName(level),
        className,
      )}
    >
      {getLevelLabel(level)}
    </span>
  )
}
