import { describe, expect, it } from 'vitest'
import { SEED_EXERCISES } from '@/lib/db/seed-data'
import { bangNhau, hienGiaTri } from '@/lib/exercise/compare'

/**
 * Chạy lời giải chính thức của TỪNG bài tập qua chính bộ test của nó.
 *
 * Đây là test có giá trị nhất trong nhóm này: nó bắt được thứ không có cách nào khác để
 * phát hiện — một giá trị `ra` gõ sai trong khối ```json test. Lỗi đó không làm hỏng
 * build, không làm hỏng giao diện; nó chỉ làm người học đúng mà bị báo sai, và họ sẽ tin
 * là mình sai chứ không nghi ngờ đề bài.
 *
 * Chạy trong Node bằng new Function — cùng cách bộ chấm nạp code trong worker, nên nếu
 * lời giải chạy được ở đây thì nó chạy được ở trình duyệt.
 */

/** Lấy khối code js đầu tiên trong phần lời giải (viết bằng markdown). */
function maLoiGiai(loiGiai: string): string | null {
  const khop = /```js\n([\s\S]*?)```/.exec(loiGiai)
  return khop?.[1] ?? null
}

function nap(ma: string, ham: string): (...args: unknown[]) => unknown {
  const factory = new Function(`${ma}\n;return typeof ${ham} === "function" ? ${ham} : undefined;`)
  const fn = factory() as ((...args: unknown[]) => unknown) | undefined
  if (fn === undefined) throw new Error(`Lời giải không định nghĩa hàm ${ham}`)
  return fn
}

describe('lời giải chính thức', () => {
  it('có ít nhất một bài tập để kiểm', () => {
    expect(SEED_EXERCISES.length).toBeGreaterThan(0)
  })

  for (const bt of SEED_EXERCISES) {
    describe(bt.slug, () => {
      it('starter code hợp lệ về cú pháp', () => {
        // Starter sai cú pháp thì người học mở bài ra đã thấy lỗi đỏ trước khi gõ gì.
        expect(() => new Function(bt.starter.js)).not.toThrow()
      })

      it('có lời giải kèm khối code js', () => {
        expect(maLoiGiai(bt.loiGiai), `Bài ${bt.slug} thiếu khối \`\`\`js trong lời giải`).not.toBeNull()
      })

      it('lời giải đạt toàn bộ ca test', () => {
        const ma = maLoiGiai(bt.loiGiai)
        if (ma === null) return
        const fn = nap(ma, bt.ham)

        for (const [i, ca] of bt.boTest.entries()) {
          const thucNhan = fn(...structuredClone(ca.vao))
          expect(
            bangNhau(thucNhan, ca.ra, bt.soSanh),
            `Ca #${i + 1} của "${bt.slug}": vào ${hienGiaTri(ca.vao)}, ` +
              `mong đợi ${hienGiaTri(ca.ra)}, nhận ${hienGiaTri(thucNhan)}`,
          ).toBe(true)
        }
      })

      it('tên hàm trong starter khớp tên hàm bộ chấm gọi', () => {
        expect(bt.starter.js).toContain(bt.ham)
      })
    })
  }
})
