import { describe, expect, it } from 'vitest'
import { SEED_NOTES } from '@/lib/db/seed-data'

/**
 * Giữ khung dạy học của `docs/khung-day-hoc.md` không bị trôi.
 *
 * Vì sao cần test chứ không tin vào sự cẩn thận: giáo trình có 157 bài, chuyển đổi dần
 * qua nhiều phiên làm việc. Tới bài thứ 40 thì khung bắt đầu lỏng ra — thiếu mục "Mental
 * model" ở bài này, mục "Tự nhớ" biến thành liệt kê kiến thức ở bài kia — và không ai
 * phát hiện được bằng mắt trên 157 file.
 *
 * Chỉ kiểm bài đã khai `khung: v2`. Bài chưa chuyển vẫn hợp lệ, nên việc chuyển đổi làm
 * dần theo mảng mà không làm đỏ bảng test.
 */

/** Mục bắt buộc, theo đúng thứ tự bảng trong docs/khung-day-hoc.md. */
const BAT_BUOC = [
  '## Ý tưởng chính',
  '## Mental model',
  '## Ví dụ nhỏ',
  '## Tại sao cần nó',
  '## Dễ nhầm',
  '## Mẹo nhớ',
  '## Tự nhớ',
  '## Tự viết lại',
]

const daChuyen = SEED_NOTES.filter((n) => n.khung === 'v2')

describe('khung dạy học v2', () => {
  it('có ít nhất một bài đã chuyển', () => {
    expect(daChuyen.length).toBeGreaterThan(0)
  })

  for (const note of daChuyen) {
    describe(note.slug, () => {
      it('có đủ các mục bắt buộc', () => {
        const thieu = BAT_BUOC.filter((m) => !note.content.includes(`\n${m}\n`))
        expect(thieu, `${note.slug} thiếu: ${thieu.join(', ')}`).toEqual([])
      })

      it('các mục xuất hiện đúng thứ tự', () => {
        // Thứ tự chính là khung dạy: hiểu → liên tưởng → ví dụ → lý do → nhớ lại → làm.
        // Đảo thứ tự là quay về kiểu "định nghĩa trước, lý do sau" mà khung này bác bỏ.
        const viTri = BAT_BUOC.map((m) => note.content.indexOf(`\n${m}\n`))
        const daSap = [...viTri].sort((a, b) => a - b)
        expect(viTri, `${note.slug}: các mục không đúng thứ tự`).toEqual(daSap)
      })

      it('mở đầu bằng mục tiêu học, không phải định nghĩa', () => {
        expect(note.content.startsWith('> **Sau bài này bạn sẽ:**'), note.slug).toBe(true)
      })

      it('phần "Tự nhớ" là câu hỏi, không phải liệt kê kiến thức', () => {
        // Đây là chỗ dễ trôi nhất: mục "Tự nhớ" rất dễ bị viết thành bản tóm tắt bài,
        // và khi đó nó không còn ép người học tự lấy thông tin ra nữa.
        const phan = note.content.split('\n## Tự nhớ\n')[1]?.split('\n## ')[0] ?? ''
        expect(phan.includes('?'), `${note.slug}: "Tự nhớ" không có câu hỏi nào`).toBe(true)
        const soCauHoi = (phan.match(/\?/g) ?? []).length
        expect(soCauHoi, `${note.slug}: cần 3-5 câu hỏi tự nhớ`).toBeGreaterThanOrEqual(3)
      })

      it('không đặt đáp án ngay dưới câu hỏi tự nhớ', () => {
        // Đáp án nằm trong bài thì mắt tự trượt xuống đọc, và việc nhớ lại không xảy ra.
        //
        // Bắt theo DẤU HIỆU ĐƯA đáp án, không bắt theo từ "đáp án": nhiều bài hỏi thẳng
        // "ghi nhận đáp án ở đâu?" — đó là câu hỏi hợp lệ, và một bộ lọc thô sẽ cấm nhầm.
        const phan = note.content.split('\n## Tự nhớ\n')[1]?.split('\n## ')[0] ?? ''
        const dauHieu = /^\s*(\*\*)?(Đáp án|Trả lời|Giải)\b|đáp án:|trả lời:/im
        expect(dauHieu.test(phan), `${note.slug}: có vẻ đang đưa đáp án`).toBe(false)
      })
    })
  }
})
