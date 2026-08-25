/// <reference lib="webworker" />
import { bangNhau, hienGiaTri, type KieuSoSanh } from './compare'
import type { CaTest } from './parse'

/**
 * Bộ chấm bài. Chạy trong Web Worker, không phải trên trang.
 *
 * Vì sao bắt buộc là worker: vòng lặp vô hạn của người học sẽ treo cả tab và không có
 * cách nào dừng lại — `while (true) {}` chặn luôn cả timer lẫn sự kiện. Worker thì
 * luồng chính `terminate()` được, nên đây là cơ chế timeout DUY NHẤT hoạt động thật
 * trong trình duyệt. Phần thưởng kèm theo: worker không chạm được DOM, cookie hay
 * localStorage của trang.
 *
 * Kết quả từng ca được gửi về NGAY khi chạy xong chứ không gom một cục cuối cùng: bị
 * terminate giữa chừng thì người học vẫn thấy các ca đã qua, và thấy ca nào làm treo.
 */

export type YeuCauChay = {
  ma: string
  ham: string
  boTest: CaTest[]
  soSanh: KieuSoSanh
}

/**
 * Giao thức dùng chung cho cả hai bộ chấm (JavaScript và Python), nên giao diện chỉ
 * phải hiểu một hình dạng tin nhắn. `dang-tai`/`san-sang` chỉ Python dùng tới — nó có
 * ~8MB runtime phải tải lần đầu, còn JavaScript thì chạy ngay.
 */
export type TinNhanKetQua =
  | { loai: 'ca'; chiSo: number; dat: boolean; thucNhan: string; ms: number; loi?: string }
  | { loai: 'loi-nap'; thongDiep: string }
  | { loai: 'dang-tai' }
  | { loai: 'san-sang' }
  | { loai: 'xong' }

function thongDiepLoi(loi: unknown): string {
  if (loi instanceof Error) return `${loi.name}: ${loi.message}`
  return String(loi)
}

self.onmessage = (e: MessageEvent<YeuCauChay>) => {
  const { ma, ham, boTest, soSanh } = e.data
  const gui = (tin: TinNhanKetQua) => self.postMessage(tin)

  let fn: ((...args: unknown[]) => unknown) | undefined
  try {
    // new Function thay vì eval: code người học chạy trong phạm vi riêng, không thấy
    // biến của worker này (nên không sửa được `boTest` để gian lận).
    const nap = new Function(`${ma}\n;return typeof ${ham} === "function" ? ${ham} : undefined;`)
    fn = nap() as typeof fn
  } catch (loi) {
    gui({ loai: 'loi-nap', thongDiep: thongDiepLoi(loi) })
    return
  }

  if (typeof fn !== 'function') {
    gui({
      loai: 'loi-nap',
      thongDiep: `Không tìm thấy hàm \`${ham}\`. Tên hàm phải đúng từng ký tự, và đừng xoá dòng khai báo.`,
    })
    return
  }

  boTest.forEach((ca, chiSo) => {
    // Nhân bản đối số cho từng ca: hàm sửa thẳng mảng đầu vào (bài "đảo ngược tại chỗ"
    // chẳng hạn) sẽ làm hỏng dữ liệu của những ca chạy sau nếu dùng chung tham chiếu.
    let vao: unknown[]
    try {
      vao = structuredClone(ca.vao)
    } catch {
      vao = ca.vao
    }

    const batDau = performance.now()
    try {
      const thucNhan = fn(...vao)
      gui({
        loai: 'ca',
        chiSo,
        dat: bangNhau(thucNhan, ca.ra, soSanh),
        thucNhan: hienGiaTri(thucNhan),
        ms: performance.now() - batDau,
      })
    } catch (loi) {
      gui({
        loai: 'ca',
        chiSo,
        dat: false,
        thucNhan: '—',
        ms: performance.now() - batDau,
        loi: thongDiepLoi(loi),
      })
    }
  })

  gui({ loai: 'xong' })
}
