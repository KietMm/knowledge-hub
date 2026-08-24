'use client'

import { Button } from '@/components/ui/button'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
      <h1 className="font-heading text-2xl font-semibold">Có lỗi xảy ra</h1>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <p className="text-xs text-muted-foreground">
        Nếu lỗi nhắc tới một mục dữ liệu cụ thể, hãy kiểm tra lại kho dữ liệu của bạn —
        ứng dụng cố tình không tự ghi đè dữ liệu hỏng.
      </p>
      <Button onClick={reset}>Thử lại</Button>
    </div>
  )
}
