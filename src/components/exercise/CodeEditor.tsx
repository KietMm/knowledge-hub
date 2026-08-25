'use client'

import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { HighlightStyle, bracketMatching, indentUnit, syntaxHighlighting } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { useEffect, useRef } from 'react'
import type { NgonNgu } from '@/lib/exercise/parse'

/**
 * Ô soạn code, bọc CodeMirror 6.
 *
 * Vì sao CodeMirror chứ không phải textarea: gõ thuật toán 30 dòng không có tô màu và
 * tự thụt lề là cực hình. Vì sao không phải Monaco: nó nặng gấp bảy lần, và autocomplete
 * kiểu IDE chẳng giúp gì cho bài tập không dùng thư viện — trong khi cả trang này đang
 * cố giữ lượng JS ở mức thấp.
 *
 * Màu lấy từ CSS variable của app (`--cm-*` trong globals.css) thay vì dùng theme dựng
 * sẵn của CodeMirror: nhờ vậy đổi sáng/tối là việc của CSS, editor không phải dựng lại,
 * và code trong ô soạn hợp màu với code trong bài học (do shiki tô).
 */

const TO_MAU = HighlightStyle.define([
  { tag: tags.keyword, color: 'var(--cm-keyword)' },
  { tag: [tags.controlKeyword, tags.moduleKeyword], color: 'var(--cm-keyword)' },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: 'var(--cm-function)' },
  { tag: [tags.string, tags.special(tags.string)], color: 'var(--cm-string)' },
  { tag: [tags.number, tags.bool, tags.null], color: 'var(--cm-number)' },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: 'var(--cm-comment)', fontStyle: 'italic' },
  { tag: [tags.propertyName, tags.attributeName], color: 'var(--cm-property)' },
  { tag: [tags.operator, tags.punctuation, tags.bracket], color: 'var(--cm-punct)' },
  { tag: [tags.typeName, tags.className], color: 'var(--cm-type)' },
])

const GIAO_DIEN = EditorView.theme({
  '&': { backgroundColor: 'transparent', fontSize: '0.8125rem' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'var(--font-mono, ui-monospace), monospace', lineHeight: '1.65' },
  '.cm-content': { padding: '0.75rem 0' },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--cm-gutter)',
    paddingRight: '0.5rem',
  },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'transparent' },
  '.cm-cursor': { borderLeftColor: 'var(--cm-cursor)' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'var(--cm-selection)',
  },
  '.cm-matchingBracket': { backgroundColor: 'var(--cm-selection)', outline: 'none' },
})

export function CodeEditor({
  value,
  ngonNgu,
  onChange,
}: {
  value: string
  ngonNgu: NgonNgu
  onChange: (ma: string) => void
}) {
  const host = useRef<HTMLDivElement | null>(null)
  const view = useRef<EditorView | null>(null)
  // onChange đi qua ref: CodeMirror chỉ dựng một lần, nên nếu bắt closure của lần render
  // đầu thì mọi lần gõ về sau sẽ gọi hàm cũ với state cũ.
  const bao = useRef(onChange)
  bao.current = onChange

  useEffect(() => {
    if (host.current === null) return

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        history(),
        bracketMatching(),
        indentUnit.of('  '),
        syntaxHighlighting(TO_MAU),
        // indentWithTab đặt TRƯỚC defaultKeymap để Tab thụt lề thay vì nhảy tiêu điểm.
        // Đánh đổi có ý thức: người dùng bàn phím thoát khỏi ô soạn bằng Esc rồi Tab,
        // đó là quy ước quen thuộc của các ô soạn code trên web.
        keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
        ngonNgu === 'py' ? python() : javascript(),
        GIAO_DIEN,
        EditorView.lineWrapping,
        EditorView.updateListener.of((v) => {
          if (v.docChanged) bao.current(v.state.doc.toString())
        }),
      ],
    })

    const cm = new EditorView({ state, parent: host.current })
    view.current = cm
    return () => {
      cm.destroy()
      view.current = null
    }
    // `value` cố tình KHÔNG nằm trong deps: nó là giá trị khởi tạo. Dựng lại editor mỗi
    // lần gõ sẽ mất con trỏ và mất lịch sử hoàn tác. Việc nạp nội dung mới từ ngoài
    // (đổi ngôn ngữ, bấm "Làm lại") đi qua effect dưới đây.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ngonNgu])

  // Nạp nội dung từ ngoài vào — chỉ khi nó thật sự khác nội dung đang có, nếu không
  // mỗi ký tự gõ ra sẽ bị ghi đè bằng chính nó và con trỏ nhảy về đầu dòng.
  useEffect(() => {
    const cm = view.current
    if (cm === null) return
    const hienTai = cm.state.doc.toString()
    if (hienTai === value) return
    cm.dispatch({ changes: { from: 0, to: hienTai.length, insert: value } })
  }, [value])

  return (
    <div
      ref={host}
      className="max-h-[28rem] min-h-[14rem] overflow-auto rounded-lg border border-code-border bg-code"
    />
  )
}
