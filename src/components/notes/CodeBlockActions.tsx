'use client'

import { useEffect } from 'react'

/**
 * HTML của ghi chú được render ở server nên không gắn sẵn React handler vào <pre>.
 * Component này chạy một lần sau khi mount, chèn nhãn ngôn ngữ và nút Copy vào từng
 * khối code. Cách này giữ nguyên ưu điểm "highlight ở server, client gần như không JS".
 */
export function CodeBlockActions() {
  useEffect(() => {
    const blocks = document.querySelectorAll<HTMLPreElement>('.note-content pre')

    for (const pre of blocks) {
      if (pre.dataset.enhanced === 'true') continue
      pre.dataset.enhanced = 'true'

      const lang = pre.dataset.lang ?? 'text'
      const label = document.createElement('span')
      label.textContent = lang
      label.className = 'absolute left-3 top-2 text-xs text-muted-foreground'
      pre.appendChild(label)

      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = 'Chép'
      button.setAttribute('aria-label', `Chép khối code ${lang}`)
      button.className =
        'absolute right-2 top-2 rounded border bg-background px-2 py-0.5 text-xs hover:bg-accent'
      button.addEventListener('click', () => {
        void navigator.clipboard.writeText(pre.querySelector('code')?.textContent ?? '').then(() => {
          button.textContent = 'Đã chép'
          window.setTimeout(() => {
            button.textContent = 'Chép'
          }, 1500)
        })
      })
      pre.appendChild(button)
    }
  }, [])

  return null
}
