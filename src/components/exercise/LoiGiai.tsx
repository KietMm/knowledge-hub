'use client'

import { Eye } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

/**
 * Lời giải ẩn sau một lần bấm.
 *
 * Vì sao không dùng thẻ <details> thuần: nội dung lời giải vẫn nằm trong DOM ngay từ
 * đầu, và người học tìm kiếm trong trang (⌘F) hoặc cuộn nhanh sẽ vô tình đọc phải đáp
 * án trước khi kịp nghĩ. Ở đây nó không được render cho tới lúc bấm.
 *
 * html đã được renderMarkdown dựng ở máy chủ từ chính file bài tập trong repo — cùng
 * lý do an toàn như NoteContent, không có nguồn nội dung bên thứ ba.
 */
export function LoiGiai({ html }: { html: string }) {
  const [hien, setHien] = useState(false)

  if (!hien) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
        <p className="mb-3 text-sm text-muted-foreground">
          Thử tự giải trước đã — lời giải sẽ có ích hơn nhiều sau khi bạn đã bí.
        </p>
        <Button variant="outline" size="sm" onClick={() => setHien(true)}>
          <Eye />
          Xem lời giải
        </Button>
      </div>
    )
  }

  return (
    <div
      className="note-content prose prose-neutral max-w-none dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
