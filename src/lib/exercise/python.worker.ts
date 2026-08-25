/// <reference lib="webworker" />
import { bangNhau, hienGiaTri } from './compare'
import type { TinNhanKetQua, YeuCauChay } from './runner.worker'

/**
 * Bộ chấm Python, chạy bằng Pyodide (CPython biên dịch sang WebAssembly).
 *
 * Vẫn là trình duyệt của người học, vẫn không có máy chủ nào chấm bài. Cái giá là lần
 * đầu phải tải ~8MB runtime — nên worker này KHÔNG bị dựng lại mỗi lần chạy như bộ chấm
 * JavaScript; nó sống suốt phiên và được nạp lại chỉ khi bị treo.
 *
 * Cách ly giữa các lần chạy vẫn giữ được: `exec` chạy trong một namespace `dict` MỚI mỗi
 * lần, nên hàm của lần chạy trước không còn sót lại. Đây là điểm quan trọng — xoá hàm đi
 * mà bài vẫn "đạt" là lỗi tệ nhất một bộ chấm có thể mắc.
 *
 * Cầu nối dữ liệu là JSON chứ không phải chuyển đổi đối tượng của Pyodide: JSON có ngữ
 * nghĩa giống nhau ở cả hai phía và không kéo theo proxy phải giải phóng bằng tay. Đổi
 * lại, hàm trả về kiểu Python thuần tuý (set, tuple lồng phức tạp) sẽ được báo lỗi rõ
 * ràng thay vì so sánh sai.
 */

const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.28.3/full/'

/** Hàm Python dựng sẵn: nạp code người học một lần, rồi gọi cho từng ca test. */
const CAU_NOI = `
import json, traceback

_kh = {}

def _kh_nap(ma, ham):
    ns = {}
    try:
        exec(ma, ns)
    except Exception as e:
        return json.dumps({"loi_nap": type(e).__name__ + ": " + str(e)})
    fn = ns.get(ham)
    if not callable(fn):
        return json.dumps({"thieu_ham": True})
    _kh["fn"] = fn
    return json.dumps({"ok": True})

def _kh_goi(vao_json):
    try:
        kq = _kh["fn"](*json.loads(vao_json))
    except Exception as e:
        return json.dumps({"ok": False, "loi": type(e).__name__ + ": " + str(e)})
    try:
        return json.dumps({"ok": True, "ra": kq})
    except TypeError:
        return json.dumps({
            "ok": False,
            "loi": "Kết quả kiểu " + type(kq).__name__ + " không so sánh được — hãy trả về list, dict, số, chuỗi hoặc bool",
        })

(_kh_nap, _kh_goi)
`

type PyodideAPI = {
  runPython: (code: string) => unknown
  globals: { get: (ten: string) => unknown }
}

declare const loadPyodide: (opts: { indexURL: string }) => Promise<PyodideAPI>

let py: PyodideAPI | null = null
let nap: ((ma: string, ham: string) => string) | null = null
let goi: ((vaoJson: string) => string) | null = null

async function chuanBi(gui: (t: TinNhanKetQua) => void): Promise<void> {
  if (py !== null) return
  gui({ loai: 'dang-tai' })
  // importScripts (đồng bộ) thay vì import động: đây là script UMD cổ điển, và trong
  // worker thì đây là cách nạp được cả ở dev lẫn sau khi đóng gói.
  ;(self as unknown as { importScripts: (u: string) => void }).importScripts(`${PYODIDE}pyodide.js`)
  py = await loadPyodide({ indexURL: PYODIDE })
  const cap = py.runPython(CAU_NOI) as { get: (i: number) => unknown }
  nap = cap.get(0) as (ma: string, ham: string) => string
  goi = cap.get(1) as (vaoJson: string) => string
  gui({ loai: 'san-sang' })
}

self.onmessage = async (e: MessageEvent<YeuCauChay>) => {
  const { ma, ham, boTest, soSanh } = e.data
  const gui = (tin: TinNhanKetQua) => self.postMessage(tin)

  try {
    await chuanBi(gui)
  } catch (loi) {
    gui({ loai: 'loi-nap', thongDiep: `Không tải được Python: ${String(loi)}` })
    return
  }
  if (nap === null || goi === null) return

  const ketQuaNap = JSON.parse(nap(ma, ham)) as {
    ok?: boolean
    loi_nap?: string
    thieu_ham?: boolean
  }
  if (ketQuaNap.loi_nap !== undefined) {
    gui({ loai: 'loi-nap', thongDiep: ketQuaNap.loi_nap })
    return
  }
  if (ketQuaNap.thieu_ham === true) {
    gui({
      loai: 'loi-nap',
      thongDiep: `Không tìm thấy hàm \`${ham}\`. Tên hàm phải đúng từng ký tự, và đừng xoá dòng \`def\`.`,
    })
    return
  }

  boTest.forEach((ca, chiSo) => {
    const batDau = performance.now()
    const kq = JSON.parse(goi!(JSON.stringify(ca.vao))) as {
      ok: boolean
      ra?: unknown
      loi?: string
    }
    const ms = performance.now() - batDau

    if (!kq.ok) {
      gui({ loai: 'ca', chiSo, dat: false, thucNhan: '—', ms, loi: kq.loi ?? 'Lỗi không rõ' })
      return
    }
    gui({
      loai: 'ca',
      chiSo,
      dat: bangNhau(kq.ra, ca.ra, soSanh),
      thucNhan: hienGiaTri(kq.ra),
      ms,
    })
  })

  gui({ loai: 'xong' })
}
