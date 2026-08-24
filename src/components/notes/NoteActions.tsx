'use client'

import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { DeleteNoteDialog } from '@/components/notes/DeleteNoteButton'
import { StarButton } from '@/components/notes/StarButton'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * Cụm hành động ở đầu bài học.
 *
 * Phân tuyến theo việc người dùng đang làm, không theo việc code tiện gom:
 *
 *  - **Ghim** ở ngoài. Đây là thao tác của người ĐANG ĐỌC ("để dành bài này"), dùng
 *    thường xuyên, và bấm nhầm thì bấm lại là xong.
 *  - **Sửa / Xoá** vào trong menu ⋯. Đây là thao tác QUẢN TRỊ, hiếm khi dùng giữa lúc
 *    đọc. Để chúng nằm trần trong luồng đọc vừa gây nhiễu, vừa đặt nút xoá — thao tác
 *    không hoàn tác được — cách nút ghim vài pixel.
 *
 * Cả cụm chỉ hiện ở bản chạy máy cá nhân; bản công khai là chỉ đọc nên trang không
 * render component này (xem `mode.ts`).
 */
export function NoteActions({
  noteId,
  slug,
  title,
  starred,
}: {
  noteId: string
  slug: string
  title: string
  starred: boolean
}) {
  const [hoiXoa, setHoiXoa] = useState(false)

  return (
    <div className="flex items-center gap-1">
      <StarButton noteId={noteId} starred={starred} />

      <DropdownMenu>
        {/* base-ui dùng prop `render` thay cho `asChild`; ở đây khớp thẻ <button> -> <button>. */}
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0" aria-label="Hành động khác">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuItem render={<Link href={`/n/${slug}/edit`} />}>
            <Pencil />
            Sửa bài học
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* Hộp thoại xác nhận nằm NGOÀI menu: chọn mục làm menu đóng lại, và nếu hộp
              thoại nằm trong đó thì nó đóng theo. Ở đây mục chỉ bật cờ, hộp thoại tự mở. */}
          <DropdownMenuItem variant="destructive" onClick={() => setHoiXoa(true)}>
            <Trash2 />
            Xoá bài học
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteNoteDialog noteId={noteId} title={title} open={hoiXoa} onOpenChange={setHoiXoa} />
    </div>
  )
}
