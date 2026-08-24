'use client'

import { useEffect, useState } from 'react'

/**
 * Thanh tiến độ đọc. Bài học ở đây dài trung bình 15 phút nên người đọc cần biết mình
 * đang ở đâu trong bài — nếu không, cuộn giữa một bài dài không phân biệt được với
 * cuộn gần hết.
 *
 * Dùng `sticky top-14` (ngay dưới Topbar) thay vì `fixed`: nó là một phần tử trong cột
 * nội dung nên tự có đúng bề rộng của cột, không phải tính bù bề rộng sidebar bằng tay
 * và không bị lệch khi sidebar gập lại.
 */
export function ReadingProgress() {
  const [phanTram, setPhanTram] = useState(0)

  useEffect(() => {
    function tinh() {
      const doc = document.documentElement
      const cuonDuoc = doc.scrollHeight - doc.clientHeight
      // Trang ngắn hơn màn hình thì không có gì để đo — coi như đã đọc hết,
      // thay vì để thanh đứng ở 0% và trông như bị treo.
      setPhanTram(cuonDuoc <= 0 ? 100 : Math.min(100, (doc.scrollTop / cuonDuoc) * 100))
    }

    tinh()
    window.addEventListener('scroll', tinh, { passive: true })
    window.addEventListener('resize', tinh)
    return () => {
      window.removeEventListener('scroll', tinh)
      window.removeEventListener('resize', tinh)
    }
  }, [])

  return (
    <div
      aria-hidden
      className="sticky top-14 z-20 -mx-4 h-0.5 bg-transparent sm:-mx-6"
    >
      <div
        className="h-full bg-foreground/70 transition-[width] duration-150 ease-out"
        style={{ width: `${phanTram}%` }}
      />
    </div>
  )
}
