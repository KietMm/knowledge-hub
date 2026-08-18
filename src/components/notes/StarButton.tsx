'use client'

import { Star } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { toggleStarAction } from '@/lib/actions/note.actions'

export function StarButton({ noteId, starred }: { noteId: string; starred: boolean }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      aria-pressed={starred}
      aria-label={starred ? 'Bỏ ghim ghi chú' : 'Ghim ghi chú'}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleStarAction(noteId)
          if (!result.ok) {
            toast.error(result.error)
            return
          }
          router.refresh()
        })
      }
    >
      <Star className={starred ? 'h-4 w-4 fill-current' : 'h-4 w-4'} />
    </Button>
  )
}
