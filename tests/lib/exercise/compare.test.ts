import { describe, expect, it } from 'vitest'
import { bangNhau, hienGiaTri } from '@/lib/exercise/compare'

describe('bangNhau — so sánh chính xác', () => {
  it('so sánh sâu mảng và object', () => {
    expect(bangNhau([1, [2, 3]], [1, [2, 3]], 'chinh-xac')).toBe(true)
    expect(bangNhau({ a: 1, b: [2] }, { b: [2], a: 1 }, 'chinh-xac')).toBe(true)
    expect(bangNhau([1, 2], [2, 1], 'chinh-xac')).toBe(false)
  })

  it('phân biệt kiểu: "1" không bằng 1', () => {
    // Bẫy kinh điển khi người học trả về chuỗi từ một phép nối.
    expect(bangNhau('1', 1, 'chinh-xac')).toBe(false)
  })

  it('null khác undefined khác thiếu field', () => {
    expect(bangNhau(null, undefined, 'chinh-xac')).toBe(false)
    expect(bangNhau({ a: undefined }, {}, 'chinh-xac')).toBe(false)
  })

  it('NaN bằng NaN — hàm không trả kết quả thì đó là lỗi khác, không phải "sai đáp án"', () => {
    expect(bangNhau(NaN, NaN, 'chinh-xac')).toBe(true)
  })

  it('mảng dài khác nhau thì khác nhau', () => {
    expect(bangNhau([1, 2], [1, 2, 3], 'chinh-xac')).toBe(false)
  })
})

describe('bangNhau — so sánh tập hợp', () => {
  it('không quan tâm thứ tự ở tầng ngoài', () => {
    expect(bangNhau([3, 1, 2], [1, 2, 3], 'tap-hop')).toBe(true)
  })

  it('không quan tâm thứ tự ở mọi tầng lồng nhau', () => {
    // Bài "liệt kê mọi bộ ba có tổng bằng 0": cả thứ tự bộ ba lẫn thứ tự trong bộ đều tự do.
    expect(bangNhau([[-1, 0, 1], [-1, -1, 2]], [[2, -1, -1], [1, -1, 0]], 'tap-hop')).toBe(true)
  })

  it('vẫn bắt được sai số lượng phần tử', () => {
    expect(bangNhau([1, 1, 2], [1, 2, 2], 'tap-hop')).toBe(false)
    expect(bangNhau([1, 2], [1, 2, 2], 'tap-hop')).toBe(false)
  })
})

describe('hienGiaTri', () => {
  it('hiện gọn, đọc được', () => {
    expect(hienGiaTri([1, 2, 3])).toBe('[1, 2, 3]')
    expect(hienGiaTri('abc')).toBe('"abc"')
    expect(hienGiaTri(null)).toBe('null')
    expect(hienGiaTri(undefined)).toBe('undefined')
  })

  it('cắt bớt giá trị quá dài để bảng kết quả không vỡ', () => {
    const dai = hienGiaTri(Array.from({ length: 500 }, (_, i) => i))
    expect(dai.length).toBeLessThan(90)
    expect(dai.endsWith('…')).toBe(true)
  })

  it('không vỡ với giá trị tự trỏ vòng', () => {
    const vong: Record<string, unknown> = {}
    vong.self = vong
    expect(() => hienGiaTri(vong)).not.toThrow()
  })
})
