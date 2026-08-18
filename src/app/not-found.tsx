import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Không tìm thấy trang</h1>
      <p className="text-sm text-muted-foreground">
        Đường dẫn có thể đã đổi hoặc ghi chú đã bị xoá.
      </p>
      <Link href="/" className={buttonVariants()}>
        Về trang chủ
      </Link>
    </div>
  )
}
