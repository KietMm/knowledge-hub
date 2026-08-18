'use client'

import { Button } from '@/components/ui/button'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Có lỗi xảy ra</h1>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <p className="text-xs text-muted-foreground">
        Nếu lỗi nhắc tới một file trong <code>data/</code>, hãy mở file đó ra kiểm tra —
        ứng dụng cố tình không tự ghi đè file hỏng.
      </p>
      <Button onClick={reset}>Thử lại</Button>
    </div>
  )
}
