'use client'

import { Check, Loader2, Play, RotateCcw, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { hienGiaTri } from '@/lib/exercise/compare'
import type { CaTest, NgonNgu } from '@/lib/exercise/parse'
import type { TinNhanKetQua, YeuCauChay } from '@/lib/exercise/runner.worker'
import { CodeEditor } from './CodeEditor'

/**
 * Ô soạn + nút chạy + bảng kết quả, cho cả JavaScript lẫn Python.
 *
 * Bốn quyết định đáng nói:
 *
 * 1. **Timeout do luồng chính giữ, không phải worker.** Worker đang kẹt trong
 *    `while (true) {}` thì không chạy nổi timer của chính nó — chỉ `terminate()` từ
 *    bên ngoài mới dừng được. Nên đồng hồ nằm ở đây.
 * 2. **Worker JavaScript dựng mới mỗi lần chạy; worker Python thì không.** Dựng mới là
 *    cách cách ly rẻ nhất, nhưng Pyodide mất vài giây để khởi động nên với Python phải
 *    giữ worker sống; việc cách ly chuyển vào bên trong (mỗi lần `exec` một namespace
 *    mới). Worker Python chỉ bị bỏ đi khi nó treo.
 * 3. **Đồng hồ chỉ bắt đầu tính sau khi Python báo sẵn sàng.** Lần đầu phải tải ~8MB;
 *    tính cả thời gian tải vào hạn 3 giây thì bài nào cũng "quá thời gian".
 * 4. **Code lưu ở localStorage, tách theo ngôn ngữ.** Bản deploy công khai chạy chế độ
 *    chỉ đọc (xem `src/lib/db/mode.ts`), không có chỗ nào trên máy chủ để ghi bài làm.
 */

const HAN_MS = 3000

type KetQuaCa = {
  trangThai: 'cho' | 'dat' | 'sai' | 'loi' | 'qua-han'
  thucNhan?: string
  ms?: number
  loi?: string
}

const TEN_NGON_NGU: Record<NgonNgu, string> = { js: 'JavaScript', py: 'Python' }

function khoaLuu(slug: string, ngonNgu: NgonNgu): string {
  return `kh:bt:${slug}:${ngonNgu}`
}

const KHOA_DA_GIAI = 'kh:bt:da-giai'

/** Đọc/ghi tập bài đã giải. Hỏng localStorage thì mất tiến độ, không được làm hỏng gì khác. */
function themDaGiai(slug: string): void {
  try {
    const raw = localStorage.getItem(KHOA_DA_GIAI)
    const daCo: unknown = raw === null ? [] : JSON.parse(raw)
    const tap = new Set(Array.isArray(daCo) ? daCo.filter((x) => typeof x === 'string') : [])
    tap.add(slug)
    localStorage.setItem(KHOA_DA_GIAI, JSON.stringify([...tap]))
    // Trang danh sách đang mở ở tab khác cần biết — `storage` không tự bắn trong cùng tab.
    window.dispatchEvent(new Event('kh:da-giai'))
  } catch {
    // localStorage đầy hoặc bị chặn (chế độ riêng tư): bỏ qua, việc chấm bài vẫn chạy.
  }
}

export function ExerciseRunner({
  slug,
  ham,
  hamPy,
  starter,
  boTest,
  soSanh,
}: {
  slug: string
  ham: string
  hamPy: string
  starter: Record<NgonNgu, string>
  boTest: CaTest[]
  soSanh: 'chinh-xac' | 'tap-hop'
}) {
  const coPython = starter.py !== ''
  const [ngonNgu, setNgonNgu] = useState<NgonNgu>('js')
  const [ma, setMa] = useState<Record<NgonNgu, string>>({ js: starter.js, py: starter.py })
  const [dangChay, setDangChay] = useState(false)
  const [dangTaiPython, setDangTaiPython] = useState(false)
  const [ketQua, setKetQua] = useState<KetQuaCa[] | null>(null)
  const [loiNap, setLoiNap] = useState<string | null>(null)

  const workerJs = useRef<Worker | null>(null)
  const workerPy = useRef<Worker | null>(null)
  const dongHo = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Nạp bài làm đang dở. Chạy trong effect chứ không phải giá trị khởi tạo của useState:
  // localStorage không tồn tại lúc render ở máy chủ, và đọc nó khi khởi tạo sẽ làm HTML
  // hai bên lệch nhau.
  useEffect(() => {
    setMa((truoc) => {
      const moi = { ...truoc }
      for (const nn of ['js', 'py'] as const) {
        try {
          const luu = localStorage.getItem(khoaLuu(slug, nn))
          if (luu !== null && luu.trim() !== '') moi[nn] = luu
        } catch {
          // Không đọc được thì giữ starter.
        }
      }
      return moi
    })
  }, [slug])

  const doiMa = useCallback(
    (moi: string) => {
      setMa((truoc) => ({ ...truoc, [ngonNgu]: moi }))
      try {
        localStorage.setItem(khoaLuu(slug, ngonNgu), moi)
      } catch {
        // Xem chú thích ở themDaGiai.
      }
    },
    [slug, ngonNgu],
  )

  const tatDongHo = useCallback(() => {
    if (dongHo.current !== null) clearTimeout(dongHo.current)
    dongHo.current = null
  }, [])

  const dungHet = useCallback(() => {
    tatDongHo()
    workerJs.current?.terminate()
    workerJs.current = null
    workerPy.current?.terminate()
    workerPy.current = null
  }, [tatDongHo])

  useEffect(() => dungHet, [dungHet])

  function chay() {
    tatDongHo()
    workerJs.current?.terminate()
    workerJs.current = null
    setLoiNap(null)
    setDangChay(true)
    setKetQua(boTest.map(() => ({ trangThai: 'cho' })))

    const laPy = ngonNgu === 'py'
    const w = laPy
      ? (workerPy.current ??
        new Worker(new URL('@/lib/exercise/python.worker.ts', import.meta.url)))
      : new Worker(new URL('@/lib/exercise/runner.worker.ts', import.meta.url))

    if (laPy) workerPy.current = w
    else workerJs.current = w

    const ketThuc = (quaHan: boolean) => {
      tatDongHo()
      setDangChay(false)
      setDangTaiPython(false)
      if (!quaHan) {
        // Worker JavaScript chỉ dùng một lần: giữ lại là giữ luôn hàm của lần chạy trước.
        if (!laPy) {
          w.terminate()
          workerJs.current = null
        }
        return
      }
      // Treo: bỏ hẳn worker. Với Python nghĩa là lần chạy sau phải tải lại runtime —
      // chậm, nhưng một worker đang kẹt thì không còn dùng được nữa.
      w.terminate()
      if (laPy) workerPy.current = null
      else workerJs.current = null
      setKetQua((truoc) =>
        (truoc ?? []).map((k) => (k.trangThai === 'cho' ? { trangThai: 'qua-han' } : k)),
      )
    }

    const hen = () => {
      tatDongHo()
      dongHo.current = setTimeout(() => ketThuc(true), HAN_MS)
    }

    w.onmessage = (e: MessageEvent<TinNhanKetQua>) => {
      const tin = e.data

      if (tin.loai === 'dang-tai') {
        // Đang tải Pyodide: dừng đồng hồ, việc này có thể mất vài giây và không phải
        // lỗi của người học.
        tatDongHo()
        setDangTaiPython(true)
        return
      }
      if (tin.loai === 'san-sang') {
        setDangTaiPython(false)
        hen()
        return
      }
      if (tin.loai === 'loi-nap') {
        setLoiNap(tin.thongDiep)
        setKetQua(null)
        ketThuc(false)
        return
      }
      if (tin.loai === 'xong') {
        ketThuc(false)
        setKetQua((truoc) => {
          if (truoc !== null && truoc.every((k) => k.trangThai === 'dat')) themDaGiai(slug)
          return truoc
        })
        return
      }

      setKetQua((truoc) => {
        const moi = [...(truoc ?? [])]
        moi[tin.chiSo] = {
          trangThai: tin.loi !== undefined ? 'loi' : tin.dat ? 'dat' : 'sai',
          thucNhan: tin.thucNhan,
          ms: tin.ms,
          ...(tin.loi === undefined ? {} : { loi: tin.loi }),
        }
        return moi
      })
    }

    w.onerror = (e) => {
      setLoiNap(e.message === '' ? 'Không chạy được code' : e.message)
      ketThuc(false)
    }

    const yeuCau: YeuCauChay = { ma: ma[ngonNgu], ham: laPy ? hamPy : ham, boTest, soSanh }
    w.postMessage(yeuCau)
    hen()
  }

  function lamLai() {
    tatDongHo()
    setDangChay(false)
    setKetQua(null)
    setLoiNap(null)
    doiMa(starter[ngonNgu])
  }

  function doiNgonNgu(nn: NgonNgu) {
    if (nn === ngonNgu || dangChay) return
    setNgonNgu(nn)
    setKetQua(null)
    setLoiNap(null)
  }

  const soDat = (ketQua ?? []).filter((k) => k.trangThai === 'dat').length
  const daXong = ketQua !== null && !dangChay
  const tatCaDat = daXong && soDat === boTest.length

  return (
    <section className="space-y-3" aria-label="Ô luyện tập">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={chay} disabled={dangChay} size="sm">
          {dangChay ? <Loader2 className="animate-spin" /> : <Play />}
          {dangTaiPython ? 'Đang tải Python…' : dangChay ? 'Đang chạy…' : 'Chạy thử'}
        </Button>
        <Button onClick={lamLai} variant="ghost" size="sm" disabled={dangChay}>
          <RotateCcw />
          Làm lại từ đầu
        </Button>

        {coPython && (
          <div
            role="tablist"
            aria-label="Ngôn ngữ"
            className="ml-auto flex overflow-hidden rounded-md border border-border"
          >
            {(['js', 'py'] as const).map((nn) => (
              <button
                key={nn}
                role="tab"
                aria-selected={ngonNgu === nn}
                onClick={() => doiNgonNgu(nn)}
                disabled={dangChay}
                className={`px-3 py-1 font-mono text-xs transition-colors disabled:opacity-50 ${
                  ngonNgu === nn ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50'
                }`}
              >
                {TEN_NGON_NGU[nn]}
              </button>
            ))}
          </div>
        )}
      </div>

      {dangTaiPython && (
        <p className="text-xs text-muted-foreground">
          Lần đầu chạy Python phải tải khoảng 8MB runtime về máy bạn. Những lần sau lấy từ
          bộ nhớ đệm của trình duyệt.
        </p>
      )}

      <CodeEditor key={ngonNgu} value={ma[ngonNgu]} ngonNgu={ngonNgu} onChange={doiMa} />

      {/* Gợi ý code chỉ hữu ích nếu người học biết nó tồn tại: bảng gợi ý tự bung khi gõ,
          nhưng phím nhận và phím gọi lại thì không có cách nào đoán ra. */}
      <p className="font-mono text-[0.7rem] text-muted-foreground">
        <kbd className="rounded border px-1">Ctrl</kbd>+<kbd className="rounded border px-1">Space</kbd> gợi
        ý · <kbd className="rounded border px-1">Tab</kbd> nhận · <kbd className="rounded border px-1">Esc</kbd> đóng
      </p>

      {loiNap !== null && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 font-mono text-xs text-destructive">
          {loiNap}
        </p>
      )}

      {ketQua !== null && (
        <div className="space-y-2">
          <p
            className={`text-sm font-medium ${tatCaDat ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}
          >
            {tatCaDat ? '✓ Đạt toàn bộ' : `Đạt ${soDat}/${boTest.length} ca`}
          </p>

          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border text-sm">
            {boTest.map((ca, i) => {
              const kq = ketQua[i] ?? { trangThai: 'cho' as const }
              const an = ca.an === true
              return (
                <li key={i} className="flex gap-3 px-3 py-2">
                  <span className="mt-0.5 shrink-0">
                    {kq.trangThai === 'dat' && <Check className="size-4 text-emerald-600 dark:text-emerald-400" />}
                    {(kq.trangThai === 'sai' || kq.trangThai === 'loi') && <X className="size-4 text-destructive" />}
                    {kq.trangThai === 'cho' && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                    {kq.trangThai === 'qua-han' && <span className="text-xs text-amber-600">⏱</span>}
                  </span>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="font-mono text-xs text-muted-foreground">
                      {/* Ca ẩn không lộ dữ liệu: nếu hiện hết, người học có thể viết hàm
                          trả về đúng những giá trị đó thay vì giải bài. */}
                      {an ? `Ca ẩn #${i + 1}` : (ca.mo_ta ?? hienGiaTri(ca.vao).slice(1, -1))}
                    </p>

                    {kq.trangThai === 'sai' && !an && (
                      <p className="font-mono text-xs">
                        <span className="text-muted-foreground">mong đợi </span>
                        <span className="text-emerald-700 dark:text-emerald-400">{hienGiaTri(ca.ra)}</span>
                        <span className="text-muted-foreground"> · nhận được </span>
                        <span className="text-destructive">{kq.thucNhan}</span>
                      </p>
                    )}
                    {kq.trangThai === 'sai' && an && (
                      <p className="font-mono text-xs text-destructive">Không đúng</p>
                    )}
                    {kq.trangThai === 'loi' && (
                      <p className="font-mono text-xs text-destructive">{kq.loi}</p>
                    )}
                    {kq.trangThai === 'qua-han' && (
                      <p className="font-mono text-xs text-amber-600">
                        Quá {HAN_MS / 1000}s — nhiều khả năng vòng lặp không kết thúc
                      </p>
                    )}
                  </div>

                  {kq.ms !== undefined && kq.trangThai === 'dat' && (
                    <span className="shrink-0 font-mono text-[0.7rem] text-muted-foreground">
                      {kq.ms < 1 ? '<1' : Math.round(kq.ms)}ms
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
