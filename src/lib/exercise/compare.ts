/**
 * So sánh kết quả người học trả về với đáp án, và định dạng giá trị để hiện trong
 * bảng kết quả.
 *
 * Tách khỏi worker chấm bài vì đây là phần dễ sai nhất và cũng là phần duy nhất test
 * được không cần trình duyệt: worker chỉ còn việc nạp code và gọi hàm.
 */

export const KIEU_SO_SANH = ['chinh-xac', 'tap-hop'] as const
export type KieuSoSanh = (typeof KIEU_SO_SANH)[number]

/**
 * Khoá chuẩn hoá của một giá trị: hai giá trị bằng nhau (theo kiểu so sánh đang dùng)
 * thì có cùng khoá. Dùng chuỗi thay vì so sánh đệ quy từng cặp vì với `tap-hop` ta cần
 * SẮP XẾP các phần tử, mà muốn sắp xếp thì phải có một thứ tự tổng — chuỗi cho sẵn điều đó.
 */
function khoa(v: unknown, tapHop: boolean, sau = 0): string {
  // Vòng lặp tự trỏ (hiếm, nhưng code người học có thể tạo ra) sẽ làm hàm này chạy mãi.
  if (sau > 20) return '"…"'
  if (v === undefined) return 'undefined'
  if (v === null) return 'null'
  if (typeof v === 'number') return Number.isNaN(v) ? 'NaN' : String(v)
  if (typeof v !== 'object') return JSON.stringify(v) ?? String(v)

  if (Array.isArray(v)) {
    const phanTu = v.map((x) => khoa(x, tapHop, sau + 1))
    // `tap-hop` sắp xếp ở MỌI tầng: bài "liệt kê mọi bộ ba" thì thứ tự trong từng bộ
    // cũng tự do, không chỉ thứ tự giữa các bộ.
    if (tapHop) phanTu.sort()
    return `[${phanTu.join(',')}]`
  }

  // Object: sắp khoá để thứ tự khai báo field không ảnh hưởng kết quả.
  const cap = Object.entries(v as Record<string, unknown>)
    .map(([k, x]) => `${JSON.stringify(k)}:${khoa(x, tapHop, sau + 1)}`)
    .sort()
  return `{${cap.join(',')}}`
}

export function bangNhau(thucNhan: unknown, mongDoi: unknown, kieu: KieuSoSanh): boolean {
  const tapHop = kieu === 'tap-hop'
  return khoa(thucNhan, tapHop) === khoa(mongDoi, tapHop)
}

const DAI_TOI_DA = 80

/** Hiện giá trị cho người đọc: gọn, có dấu nháy ở chuỗi, và không bao giờ làm vỡ bảng. */
export function hienGiaTri(v: unknown): string {
  if (v === undefined) return 'undefined'
  let s: string
  try {
    s = JSON.stringify(v) ?? String(v)
  } catch {
    // Vòng tự trỏ hoặc BigInt: vẫn phải hiện được cái gì đó thay vì ném lỗi ra UI.
    s = String(v)
  }
  s = s.replace(/,(?=[^\s])/g, ', ')
  return s.length > DAI_TOI_DA ? `${s.slice(0, DAI_TOI_DA)}…` : s
}
