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
} from '@/components/ui/alert-dialog'
import { deleteNoteAction } from '@/lib/actions/note.actions'

/**
 * Hộp xác nhận xoá, KHÔNG kèm nút mở.
 *
 * Trước đây component này tự mang theo một nút "Xoá" đặt ngay cạnh nút ghim, giữa vùng
 * đọc. Hai vấn đề: (1) xoá là thao tác quản trị, không thuộc luồng đọc; (2) nút xoá kề
 * nút ghim là bẫy bấm nhầm — hai hành động cách nhau vài pixel mà một cái hoàn tác được,
 * một cái thì không.
 *
 * Nay nút mở nằm trong menu ⋯ của `NoteActions`, còn hộp thoại thì được điều khiển từ
 * ngoài qua `open`/`onOpenChange`. Tách vậy vì hộp thoại không được nằm BÊN TRONG menu:
 * menu đóng lại khi chọn mục, và nó sẽ kéo theo hộp thoại đóng cùng.
 */
export function DeleteNoteDialog({
  noteId,
  title,
  open,
  onOpenChange,
}: {
  noteId: string
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xoá bài học &quot;{title}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            Hành động này không hoàn tác được. Nội dung bài học sẽ bị xoá khỏi dữ liệu của bạn.
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
                toast.success('Đã xoá bài học')
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
