'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { deleteNoteAction } from '@/lib/actions/note.actions'

export function DeleteNoteButton({ noteId, title }: { noteId: string; title: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <AlertDialog>
      {/* base-ui dùng prop `render`, không có `asChild`. Ở đây khớp thẻ (<button> -> <button>)
          nên bọc Button qua `render` là đúng cách. */}
      <AlertDialogTrigger render={<Button variant="outline" size="sm">Xoá</Button>} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xoá ghi chú &quot;{title}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            Hành động này không hoàn tác được. Nội dung ghi chú sẽ bị xoá khỏi data/notes.json.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Huỷ</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteNoteAction(noteId)
                if (!result.ok) {
                  toast.error(result.error)
                  return
                }
                toast.success('Đã xoá ghi chú')
                router.push(result.data.topicSlug === '' ? '/' : `/t/${result.data.topicSlug}`)
              })
            }
          >
            Xoá
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
