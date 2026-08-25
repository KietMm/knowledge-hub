import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SEED_EXERCISES } from '@/lib/db/seed-data'
import { bangNhau, hienGiaTri } from '@/lib/exercise/compare'

/**
 * Chạy lời giải Python của từng bài tập qua chính bộ test của nó, bằng `python3` thật.
 *
 * Trình duyệt chạy Pyodide (CPython trên WebAssembly) chứ không phải python3, nên đây
 * không phải cùng một runtime. Nhưng thứ cần kiểm ở đây là NỘI DUNG — lời giải có đúng
 * không, và bộ test có hợp lệ với ngữ nghĩa Python không (list vs tuple, chia lấy nguyên,
 * so sánh chuỗi). Phần khác biệt giữa hai runtime không chạm tới những điều đó.
 *
 * Bỏ qua nếu máy không có python3: kiểm thử nội dung không đáng làm hỏng `pnpm test` của
 * người chỉ muốn sửa giao diện.
 */

function coPython3(): boolean {
  try {
    execFileSync('python3', ['--version'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

const CO_PY = coPython3()
const thuMuc = CO_PY ? mkdtempSync(join(tmpdir(), 'kh-bt-')) : ''

function maPython(loiGiai: string): string | null {
  const khop = /```py\n([\s\S]*?)```/.exec(loiGiai)
  return khop?.[1] ?? null
}

describe.skipIf(!CO_PY)('lời giải Python', () => {
  for (const bt of SEED_EXERCISES) {
    const ma = maPython(bt.loiGiai)

    it.skipIf(ma === null)(`${bt.slug} — đạt toàn bộ ca test`, () => {
      if (ma === null) return
      const file = join(thuMuc, `${bt.slug}.py`)
      // Bộ test đi qua argv chứ không nhúng vào nguồn: chuỗi trong dữ liệu test có thể
      // chứa dấu nháy, và nhúng thẳng là mời gọi lỗi cú pháp ngẫu nhiên.
      writeFileSync(
        file,
        `${ma}\n\nimport sys, json\n` +
          `_cases = json.loads(sys.argv[1])\n` +
          `print(json.dumps([${bt.hamPy}(*c["vao"]) for c in _cases]))\n`,
        'utf8',
      )

      const raw = execFileSync('python3', [file, JSON.stringify(bt.boTest)], {
        encoding: 'utf8',
        timeout: 15_000,
      })
      const thucNhan = JSON.parse(raw) as unknown[]

      for (const [i, ca] of bt.boTest.entries()) {
        expect(
          bangNhau(thucNhan[i], ca.ra, bt.soSanh),
          `Ca #${i + 1} của "${bt.slug}": mong đợi ${hienGiaTri(ca.ra)}, nhận ${hienGiaTri(thucNhan[i])}`,
        ).toBe(true)
      }
    })
  }
})
