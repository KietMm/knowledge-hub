'use client'

import { Check, Loader2, Play, RotateCcw, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { hienGiaTri } from '@/lib/exercise/compare'
import type { CaTest, NgonNgu } from '@/lib/exercise/parse'
import type { TinNhanKetQua, YeuCauChay } from '@/lib/exercise/runner.worker'
import { CodeEditor } from './CodeEditor'

/**
 * Ô soạn + nút chạy + bảng kết quả.
 *
 * Ba quyết định đáng nói:
 *
 * 1. **Timeout do luồng chính giữ, không phải worker.** Worker đang kẹt trong
 *    `while (true) {}` thì không chạy nổi timer của chính nó — chỉ `terminate()` từ
 *    bên ngoài mới dừng được. Nên đồng hồ nằm ở đây.
 * 2. **Worker dựng mới cho mỗi lần chạy.** Dùng lại một worker thì lần chạy trước để
 *    lại biến toàn cục và hàm cũ; người học xoá một hàm đi mà bài vẫn "đạt" là lỗi
 *    tệ nhất một bộ chấm có thể mắc.
 * 3. **Code lưu ở localStorage.** Bản deploy công khai chạy chế độ chỉ đọc (xem
 *    `src/lib/db/mode.ts`), không có chỗ nào trên máy chủ để ghi bài làm.
 */

const HAN_MS = 3000

type KetQuaCa = {
  trangThai: 'cho' | 'dat' | 'sai' | 'loi' | 'qua-han'
  thucNhan?: string
  ms?: number
  loi?: string
}

function khoaLuu(slug: string, ngonNgu: NgonNgu): string {
  return `kh:bt:${slug}:${ngonNgu}`
}

const KHOA_DA_GIAI = 'kh:bt:da-giai'

function danhDauDaGiai(slug: string): void {
  try {
    const raw = localStorage.getItem(KHOA_DA_GIAI)
    const daCo: unknown = raw === null ? [] : JSON.parse(raw)
    const tap = new Set(Array.isArray(daCo) ? daCo.filter((x) => typeof x === 'string') : [])
    tap.add(slug)
    localStorage.setItem(KHOA_DA_GIAI, JSON.stringify([...tap]))
  } catch {
    // localStorage đầy hoặc bị chặn (chế độ riêng tư): mất tiến độ thì tiếc, nhưng
    // không có lý do gì để làm hỏng việc chấm bài đang chạy.
  }
}

export function ExerciseRunner({
  slug,
  ham,
  starter,
  boTest,
  soSanh,
}: {
  slug: string
  ham: string
  starter: Record<NgonNgu, string>
  boTest: CaTest[]
  soSanh: 'chinh-xac' | 'tap-hop'
}) {
  const [ma, setMa] = useState(starter.js)
  const [dangChay, setDangChay] = useState(false)
  const [ketQua, setKetQua] = useState<KetQuaCa[] | null>(null)
  const [loiNap, setLoiNap] = useState<string | null>(null)
  const worker = useRef<Worker | null>(null)
  const dongHo = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Nạp bài làm đang dở. Chạy trong effect chứ không phải giá trị khởi tạo của useState:
  // localStorage không tồn tại lúc render ở máy chủ, và đọc nó khi khởi tạo sẽ làm
  // HTML hai bên lệch nhau.
  useEffect(() => {
    try {
      const luu = localStorage.getItem(khoaLuu(slug, 'js'))
      if (luu !== null && luu.trim() !== '') setMa(luu)
    } catch {
      // Không đọc được thì dùng starter — không cần báo gì.
    }
  }, [slug])

  const doiMa = useCallback(
    (moi: string) => {
      setMa(moi)
      try {
        localStorage.setItem(khoaLuu(slug, 'js'), moi)
      } catch {
        // Xem chú thích ở danhDauDaGiai.
      }
    },
    [slug],
  )

  const dungLai = useCallback(() => {
    worker.current?.terminate()
    worker.current = null
    if (dongHo.current !== null) clearTimeout(dongHo.current)
    dongHo.current = null
  }, [])

  useEffect(() => dungLai, [dungLai])

  function chay() {
    dungLai()
    setLoiNap(null)
    setDangChay(true)
    setKetQua(boTest.map(() => ({ trangThai: 'cho' })))

    const w = new Worker(new URL('@/lib/exercise/runner.worker.ts', import.meta.url))
    worker.current = w

    const xong = (quaHan: boolean) => {
      dungLai()
      setDangChay(false)
      if (quaHan) {
        // Ca nào chưa có kết quả lúc hết giờ thì chính nó (hoặc một ca trước đó) đang treo.
        setKetQua((truoc) =>
          (truoc ?? []).map((k) => (k.trangThai === 'cho' ? { trangThai: 'qua-han' } : k)),
        )
      }
    }

    w.onmessage = (e: MessageEvent<TinNhanKetQua>) => {
      const tin = e.data
      if (tin.loai === 'loi-nap') {
        setLoiNap(tin.thongDiep)
        setKetQua(null)
        xong(false)
        return
      }
      if (tin.loai === 'xong') {
        xong(false)
        setKetQua((truoc) => {
          if (truoc !== null && truoc.every((k) => k.trangThai === 'dat')) danhDauDaGiai(slug)
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
      xong(false)
    }

    const yeuCau: YeuCauChay = { ma, ham, boTest, soSanh }
    w.postMessage(yeuCau)
    dongHo.current = setTimeout(() => xong(true), HAN_MS)
  }

  function lamLai() {
    dungLai()
    setDangChay(false)
    setKetQua(null)
    setLoiNap(null)
    doiMa(starter.js)
  }

  const soDat = (ketQua ?? []).filter((k) => k.trangThai === 'dat').length
  const daXong = ketQua !== null && !dangChay
  const tatCaDat = daXong && soDat === boTest.length

  return (
    <section className="space-y-3" aria-label="Ô luyện tập">
      <div className="flex items-center gap-2">
        <Button onClick={chay} disabled={dangChay} size="sm">
          {dangChay ? <Loader2 className="animate-spin" /> : <Play />}
          {dangChay ? 'Đang chạy…' : 'Chạy thử'}
        </Button>
        <Button onClick={lamLai} variant="ghost" size="sm" disabled={dangChay}>
          <RotateCcw />
          Làm lại từ đầu
        </Button>
        <span className="ml-auto font-mono text-xs text-muted-foreground">JavaScript</span>
      </div>

      <CodeEditor value={ma} ngonNgu="js" onChange={doiMa} />

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
