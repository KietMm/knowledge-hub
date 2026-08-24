'use client'

import { useEffect } from 'react'

/**
 * HTML của bài học được render ở server nên không gắn sẵn React handler vào <pre>.
 * Component này chạy một lần sau khi mount, chèn **dải chrome** (nhãn ngôn ngữ + nút Chép)
 * vào từng khối code. Cách này giữ nguyên ưu điểm "highlight ở server, client gần như
 * không JS".
 *
 * Dải chrome được chèn làm phần tử ĐẦU TIÊN trong <pre>, không phải hai phần tử
 * `position: absolute` trôi nổi như bản trước: cách cũ phải chừa `padding-top: 2.25rem`
 * cho cả khối và nhãn vẫn nằm đè lên vùng code, nên khối một dòng trông rỗng ở trên.
 */
export function CodeBlockActions() {
  useEffect(() => {
    const blocks = document.querySelectorAll<HTMLPreElement>('.note-content pre')

    for (const pre of blocks) {
      if (pre.dataset.enhanced === 'true') continue
      pre.dataset.enhanced = 'true'

      const lang = pre.dataset.lang ?? 'text'

      const chrome = document.createElement('div')
      chrome.className = 'code-chrome'

      const label = document.createElement('span')
      label.className = 'code-lang'
      label.textContent = lang
      chrome.appendChild(label)

      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = 'Chép'
      button.setAttribute('aria-label', `Chép khối code ${lang}`)
      button.className =
        'inline-flex min-h-8 items-center rounded border border-transparent px-2.5 font-mono text-xs text-muted-foreground ' +
        'transition-colors hover:border-border hover:bg-background hover:text-foreground ' +
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

      button.addEventListener('click', () => {
        // textContent của <code> là code thô: dải chrome nằm ngoài <code> nên nhãn
        // ngôn ngữ và chữ "Chép" không lọt vào clipboard.
        const code = pre.querySelector('code')?.textContent ?? ''
        void navigator.clipboard
          .writeText(code)
          .then(() => {
            button.textContent = 'Đã chép'
          })
          .catch(() => {
            // clipboard bị chặn (không phải HTTPS, hoặc người dùng từ chối quyền):
            // nói thật thay vì báo đã chép xong.
            button.textContent = 'Không chép được'
          })
          .finally(() => {
            window.setTimeout(() => {
              button.textContent = 'Chép'
            }, 1500)
          })
      })
      chrome.appendChild(button)

      pre.prepend(chrome)
    }
  }, [])

  return null
}
