'use client'

import { Button } from '@/components/ui/button'
// Root layout không còn được render khi chính nó ném lỗi, nên file này phải tự mang theo
// CSS của mình — import lại globals.css chứ không dựa vào layout.tsx.
import './globals.css'

// Next yêu cầu file này tự render <html>/<body>: nó thay thế toàn bộ root layout khi
// chính root layout (nơi ensureSeeded()/buildSearchIndex() chạy) ném lỗi — error.tsx
// thường không bắt được trường hợp đó vì nó nằm CÙNG CẤP với layout, không phải con của nó.
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
          <h1 className="text-2xl font-semibold">Có lỗi xảy ra khi khởi động ứng dụng</h1>
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <p className="text-xs text-muted-foreground">
            Nếu lỗi nhắc tới một mục dữ liệu cụ thể, hãy kiểm tra lại kho dữ liệu của bạn —
            ứng dụng cố tình không tự ghi đè dữ liệu hỏng. Sửa xong, bấm thử lại bên dưới.
          </p>
          <Button onClick={reset}>Thử lại</Button>
        </div>
      </body>
    </html>
  )
}
