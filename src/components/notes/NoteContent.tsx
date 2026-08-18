import { CodeBlockActions } from './CodeBlockActions'

/**
 * html đến từ renderMarkdown (chạy ở server, dữ liệu do chính chủ sở hữu nhập),
 * nên dangerouslySetInnerHTML ở đây là có kiểm soát: không có nguồn nội dung bên thứ ba.
 */
export function NoteContent({ html }: { html: string }) {
  return (
    <>
      <div
        className="note-content prose prose-neutral max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <CodeBlockActions />
    </>
  )
}
