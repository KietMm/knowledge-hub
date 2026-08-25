import { describe, expect, it } from 'vitest'
import { SEED_EXERCISES, SEED_NOTES } from '@/lib/db/seed-data'
import { nhanTag, tagDaKhaiNhan } from '@/lib/tag-label'

/**
 * Bảng nhãn tag phải phủ hết giáo trình. Đây không phải test "cho có": không có nó thì
 * thêm một tag mới vào `content/` rồi quên khai nhãn sẽ khiến giao diện hiện ra slug
 * thô (`nen-tang`) — hỏng đúng thứ bảng này sinh ra để sửa, và hỏng im lặng.
 */
describe('nhanTag', () => {
  // Cả tag bài học lẫn chủ đề bài tập: hai nguồn này hiện ra cùng một chỗ trên giao diện
  // và cùng đi qua bảng nhãn, nên cùng phải được phủ.
  const dangDung = [
    ...new Set([...SEED_NOTES.flatMap((n) => n.tags), ...SEED_EXERCISES.flatMap((bt) => bt.chuDe)]),
  ].sort()

  it('mọi tag đang dùng trong giáo trình đều đã khai nhãn', () => {
    const daKhai = new Set(tagDaKhaiNhan())
    const thieu = dangDung.filter((t) => !daKhai.has(t))
    expect(thieu, `Tag chưa khai nhãn trong src/lib/tag-label.ts: ${thieu.join(', ')}`).toEqual([])
  })

  it('không nhãn nào trùng nhau', () => {
    // Hai chip trông giống hệt nhau mà lọc ra hai kết quả khác nhau là lỗi giao diện
    // không ai gỡ nổi bằng mắt.
    const theoNhan = new Map<string, string[]>()
    for (const tag of dangDung) {
      const nhan = nhanTag(tag)
      theoNhan.set(nhan, [...(theoNhan.get(nhan) ?? []), tag])
    }
    const trung = [...theoNhan.entries()].filter(([, tags]) => tags.length > 1)
    expect(trung, `Nhãn bị trùng: ${trung.map(([n, t]) => `"${n}" <- ${t.join('/')}`).join('; ')}`).toEqual([])
  })

  it('không nhãn nào còn trông như slug', () => {
    // Nhãn lọt lưới thường lộ ra ở hai dấu hiệu: còn dấu gạch nối giữa hai từ thường,
    // hoặc là một từ tiếng Việt viết không dấu.
    const nghi = dangDung.filter((t) => {
      const nhan = nhanTag(t)
      return nhan === t && t.includes('-') && t === t.toLowerCase()
    })
    expect(nghi, `Nhãn có thể chưa được đặt: ${nghi.join(', ')}`).toEqual([])
  })

  it('dịch đúng các ví dụ tiêu biểu', () => {
    expect(nhanTag('nen-tang')).toBe('Nền tảng')
    expect(nhanTag('cau-truc-du-lieu')).toBe('Cấu trúc dữ liệu')
    expect(nhanTag('hieu-nang')).toBe('Hiệu năng')
    expect(nhanTag('postgresql')).toBe('PostgreSQL')
    expect(nhanTag('useeffect')).toBe('useEffect')
  })

  it('tag lạ vẫn ra một nhãn đọc được, không vỡ giao diện', () => {
    expect(nhanTag('mot-tag-la')).toBe('Mot tag la')
    expect(nhanTag('x')).toBe('X')
  })
})
