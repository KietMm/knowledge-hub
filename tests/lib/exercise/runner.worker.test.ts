import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TinNhanKetQua, YeuCauChay } from '@/lib/exercise/runner.worker'

/**
 * Nạp chính file worker với một `self` giả rồi bắn tin vào nó.
 *
 * Không có Web Worker thật trong Node, nhưng thứ đáng test ở đây không phải bản thân
 * Worker (đó là việc của trình duyệt) mà là GIAO THỨC: nạp code người học, chạy từng ca,
 * gửi kết quả về đúng hình dạng, và không để một ca lỗi làm chết cả lượt chấm.
 */
async function chay(yeuCau: YeuCauChay): Promise<TinNhanKetQua[]> {
  vi.resetModules()
  const tin: TinNhanKetQua[] = []
  const self = {
    onmessage: null as ((e: { data: YeuCauChay }) => void) | null,
    postMessage: (t: TinNhanKetQua) => tin.push(t),
  }
  vi.stubGlobal('self', self)
  await import('@/lib/exercise/runner.worker')
  self.onmessage?.({ data: yeuCau })
  return tin
}

const CO_BAN: Omit<YeuCauChay, 'ma'> = {
  ham: 'cong',
  boTest: [
    { vao: [1, 2], ra: 3 },
    { vao: [0, 0], ra: 0 },
  ],
  soSanh: 'chinh-xac',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('bộ chấm', () => {
  it('code đúng thì mọi ca đều đạt', async () => {
    const tin = await chay({ ...CO_BAN, ma: 'function cong(a, b) { return a + b }' })
    const ca = tin.filter((t) => t.loai === 'ca')
    expect(ca).toHaveLength(2)
    expect(ca.every((t) => t.loai === 'ca' && t.dat)).toBe(true)
    expect(tin.at(-1)?.loai).toBe('xong')
  })

  it('code sai báo đúng ca nào sai và nhận được gì', async () => {
    const tin = await chay({ ...CO_BAN, ma: 'function cong(a, b) { return a - b }' })
    const dau = tin[0]
    expect(dau?.loai === 'ca' && dau.dat).toBe(false)
    expect(dau?.loai === 'ca' && dau.thucNhan).toBe('-1')
  })

  it('lỗi cú pháp báo một lần, không chạy ca nào', async () => {
    const tin = await chay({ ...CO_BAN, ma: 'function cong(a, b) { return a +' })
    expect(tin).toHaveLength(1)
    expect(tin[0]?.loai).toBe('loi-nap')
  })

  it('thiếu hàm cần viết thì nói rõ tên hàm', async () => {
    const tin = await chay({ ...CO_BAN, ma: 'function saiTen(a, b) { return a + b }' })
    expect(tin[0]?.loai === 'loi-nap' && tin[0].thongDiep).toContain('cong')
  })

  it('một ca ném lỗi không làm chết các ca sau', async () => {
    // Đây là điểm khác biệt giữa "bộ chấm dùng được" và "bộ chấm bỏ cuộc ở lỗi đầu tiên".
    const ma = 'function cong(a, b) { if (a === 1) throw new Error("bùm"); return a + b }'
    const tin = await chay({ ...CO_BAN, ma })
    const ca = tin.filter((t) => t.loai === 'ca')
    expect(ca).toHaveLength(2)
    expect(ca[0]?.loai === 'ca' && ca[0].loi).toContain('bùm')
    expect(ca[1]?.loai === 'ca' && ca[1].dat).toBe(true)
  })

  it('hàm sửa thẳng mảng đầu vào không làm hỏng ca sau', async () => {
    // Bài "đảo ngược tại chỗ" cố tình sửa đối số — nếu các ca dùng chung tham chiếu,
    // ca thứ hai sẽ nhận dữ liệu đã bị ca đầu bóp méo.
    const chung = [3, 1, 2]
    const tin = await chay({
      ma: 'function sap(a) { a.sort((x, y) => x - y); return a }',
      ham: 'sap',
      boTest: [
        { vao: [chung], ra: [1, 2, 3] },
        { vao: [chung], ra: [1, 2, 3] },
      ],
      soSanh: 'chinh-xac',
    })
    expect(tin.filter((t) => t.loai === 'ca' && t.dat)).toHaveLength(2)
    expect(chung).toEqual([3, 1, 2])
  })

  it('code người học không thấy được biến của bộ chấm', async () => {
    // Nếu thấy được `boTest` thì bài nào cũng "giải" được bằng cách đọc đáp án.
    const ma = 'function cong() { return typeof boTest === "undefined" ? "kin" : "ho" }'
    const tin = await chay({ ...CO_BAN, ma, boTest: [{ vao: [], ra: 'kin' }] })
    expect(tin[0]?.loai === 'ca' && tin[0].dat).toBe(true)
  })
})
