import { ArrowLeft, ArrowRight } from 'lucide-react'
import Link from 'next/link'

/**
 * Điều hướng "trước / tiếp theo" ở cuối trang, dùng chung cho bài học và bài tập.
 *
 * Lý do nó tồn tại: khi nội dung là một lộ trình, hành động tiếp theo của người đọc gần
 * như luôn là "cái sau" — bắt họ quay lại trang danh sách để tìm lại vị trí mình đang ở
 * là một bước thừa.
 *
 * Nhận `{slug, title}` và một tiền tố đường dẫn thay vì gắn chặt vào kiểu `Note`: markup
 * cho hai loại giống hệt nhau, và nhân bản nó để đổi mỗi tiền tố `/n` thành `/bt` là kiểu
 * trùng lặp rồi sẽ lệch nhau sau vài lần sửa.
 */
export type MucDieuHuong = { slug: string; title: string }

export function PrevNextNav({
  prev,
  next,
  index,
  total,
  tienTo,
  nhanAria,
}: {
  prev: MucDieuHuong | null
  next: MucDieuHuong | null
  index: number
  total: number
  /** '/n' cho bài học, '/bt' cho bài tập. */
  tienTo: string
  nhanAria: string
}) {
  if (prev === null && next === null) return null

  return (
    <nav aria-label={nhanAria} className="mt-10 border-t pt-6">
      {index >= 0 && total > 0 && (
        <p className="mb-3 text-center font-mono text-[0.7rem] uppercase tracking-wide text-muted-foreground">
          Bài {index + 1}/{total}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Ô trống giữ chỗ khi thiếu một đầu, để nút còn lại không nhảy sang trái */}
        {prev === null ? (
          <div className="hidden flex-1 sm:block" />
        ) : (
          <Link
            href={`${tienTo}/${prev.slug}`}
            className="group flex flex-1 items-center gap-3 rounded-lg border px-4 py-3 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block font-mono text-[0.7rem] uppercase tracking-wide text-muted-foreground">Bài trước</span>
              <span className="block truncate text-sm font-medium">{prev.title}</span>
            </span>
          </Link>
        )}

        {next === null ? (
          <div className="hidden flex-1 sm:block" />
        ) : (
          <Link
            href={`${tienTo}/${next.slug}`}
            className="group flex flex-1 items-center justify-end gap-3 rounded-lg border px-4 py-3 text-right outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="min-w-0">
              <span className="block font-mono text-[0.7rem] uppercase tracking-wide text-muted-foreground">Bài tiếp theo</span>
              <span className="block truncate text-sm font-medium">{next.title}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        )}
      </div>
    </nav>
  )
}
