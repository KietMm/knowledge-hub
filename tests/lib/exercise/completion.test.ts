import { CompletionContext, type CompletionResult } from '@codemirror/autocomplete'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { THANH_VIEN_JS, goiYThanhVienJs, goiYThanhVienPy } from '@/lib/exercise/completion'

/**
 * Chạy nguồn gợi ý bằng EditorState thật nhưng KHÔNG cần DOM: state và cây cú pháp của
 * CodeMirror hoạt động độc lập với view, nên phần quyết định "có gợi ý không, và thay vào
 * đoạn nào" test được thẳng ở Node.
 */
async function goiY(doc: string, ngonNgu: 'js' | 'py'): Promise<CompletionResult | null> {
  const state = EditorState.create({ doc, extensions: [ngonNgu === 'py' ? python() : javascript()] })
  const nguon = ngonNgu === 'py' ? goiYThanhVienPy : goiYThanhVienJs
  // Nguồn có thể trả về Promise (chữ ký của CompletionSource cho phép) — await nhận cả hai.
  return nguon(new CompletionContext(state, doc.length, false))
}

describe('gợi ý sau dấu chấm', () => {
  it('gõ `nums.` thì hiện method', async () => {
    const kq = await goiY('const nums = []\nnums.', 'js')
    expect(kq).not.toBeNull()
    expect(kq?.options.map((o) => o.label)).toContain('push')
  })

  it('thay từ SAU dấu chấm, không nuốt mất dấu chấm', async () => {
    // from sai một ký tự sẽ cho ra `nums..push` hoặc `numspush` — cả hai đều hỏng lặng lẽ.
    const doc = 'nums.pu'
    const kq = await goiY(doc, 'js')
    expect(kq?.from).toBe(doc.indexOf('.') + 1)
  })

  it('không gợi ý khi chưa có dấu chấm', async () => {
    expect(await goiY('const nums = []\nnums', 'js')).toBeNull()
  })

  it('không gợi ý cho số thập phân đang gõ dở', async () => {
    // `1.` là số, không phải truy cập thuộc tính.
    expect(await goiY('const x = 1.', 'js')).toBeNull()
  })

  it('không gợi ý bên trong chuỗi', async () => {
    expect(await goiY('const s = "a.b', 'js')).toBeNull()
  })

  it('không gợi ý bên trong chú thích', async () => {
    expect(await goiY('// xem thêm ở nums.', 'js')).toBeNull()
  })

  it('gợi ý được sau dấu ngoặc đóng — chuỗi phương thức', async () => {
    const kq = await goiY('nums.filter(x => x > 0).', 'js')
    expect(kq?.options.map((o) => o.label)).toContain('map')
  })

  it('Python có method của list và dict, không lẫn của JS', async () => {
    const kq = await goiY('d = {}\nd.', 'py')
    const nhan = kq?.options.map((o) => o.label) ?? []
    expect(nhan).toContain('items')
    expect(nhan).toContain('append')
    expect(nhan).not.toContain('forEach')
  })

  it('mỗi gợi ý nói rõ nó thuộc kiểu nào', async () => {
    // Danh sách là biên soạn tay và KHÔNG biết kiểu thật của biến, nên nhãn "mảng"/"Map"
    // ở cột phải là thứ duy nhất giúp người học không gọi nhầm method của kiểu khác.
    for (const c of THANH_VIEN_JS) {
      expect(c.detail, `thiếu nhãn kiểu: ${c.label}`).toBeTruthy()
    }
  })

  it('không có nhãn trùng nhau trong cùng một ngôn ngữ', async () => {
    const nhan = THANH_VIEN_JS.map((c) => c.label)
    expect(nhan.length).toBe(new Set(nhan).size)
  })
})
