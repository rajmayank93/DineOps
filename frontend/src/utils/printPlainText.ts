/** Opens a minimal print dialog with monospace plain text (thermal-style receipt). */
export function printPlainText(text: string, documentTitle = 'Receipt'): void {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = 'none'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document
  if (!doc) {
    iframe.remove()
    return
  }

  const esc = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  doc.open()
  doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${documentTitle.replace(/</g, '')}</title>
<style>
  @media print { body { margin: 8px; } }
  body { font-family: ui-monospace, 'Cascadia Code', 'Consolas', monospace; font-size: 12px; line-height: 1.3; margin: 12px; }
  pre { margin: 0; white-space: pre-wrap; word-break: break-word; }
</style></head><body><pre>${esc}</pre></body></html>`)
  doc.close()

  const w = iframe.contentWindow
  if (!w) {
    iframe.remove()
    return
  }

  w.focus()
  w.print()
  setTimeout(() => iframe.remove(), 600)
}
