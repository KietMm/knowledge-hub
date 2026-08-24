/**
 * Ước lượng thời gian đọc để hiện trên thẻ bài học và đầu trang chi tiết.
 *
 * Code đọc chậm hơn văn xuôi nhiều, nên khối ``` được tách ra và tính theo dòng
 * thay vì theo từ — nếu gộp chung, một bài toàn code sẽ bị báo "1 phút" trong khi
 * thực tế mất lâu hơn hẳn.
 */

const WORDS_PER_MINUTE = 200
const CODE_LINES_PER_MINUTE = 20

/** Tách nội dung thành phần văn xuôi và phần code (theo dòng). */
function split(markdown: string): { prose: string; codeLines: number } {
  const lines = markdown.split('\n')
  const prose: string[] = []
  let codeLines = 0
  let inFence = false

  for (const line of lines) {
    if (line.trimStart().startsWith('```')) {
      inFence = !inFence
      continue
    }
    if (inFence) codeLines += 1
    else prose.push(line)
  }
  return { prose: prose.join(' '), codeLines }
}

/** Luôn trả về ít nhất 1 phút: "0 phút đọc" là thông tin vô nghĩa với người đọc. */
export function estimateReadingMinutes(markdown: string): number {
  const { prose, codeLines } = split(markdown)
  const words = prose.split(/\s+/).filter((w) => w.length > 0).length
  const minutes = words / WORDS_PER_MINUTE + codeLines / CODE_LINES_PER_MINUTE
  return Math.max(1, Math.round(minutes))
}

/**
 * Định dạng tổng thời lượng cho người đọc.
 *
 * Không quy về giờ khi chưa đủ một giờ: "0,7 giờ" bắt người đọc tự nhân nhẩm, còn
 * "42 phút" thì hiểu ngay. Trên một giờ mới đổi đơn vị, và làm tròn tới nửa giờ vì
 * đây là con số ước lượng — "3,5 giờ" trung thực hơn "3,47 giờ".
 */
export function formatReadingDuration(minutes: number): string {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} phút`
  const gio = Math.round((minutes / 60) * 2) / 2
  return `${gio.toLocaleString('vi-VN')} giờ`
}
