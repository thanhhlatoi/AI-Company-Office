import { Children, useMemo, type ReactNode } from 'react'
import Markdown, { type Components } from 'react-markdown'
import { Hl, RedactedBadge } from './highlight'

const SAFE_URL = /^(https?:|mailto:)/i
const host = (href: string) => { try { return new URL(href).host || href } catch { return href } }

/** [REDACTED:X] NGOÀI khối code -> mã inline để `code` bên dưới vẽ thành huy hiệu (trong khối code vẽ trực tiếp). */
function markRedacted(md: string) {
  return md.split(/(```[\s\S]*?```)/g).map((part, i) => (i % 2 ? part : part.replace(/\[REDACTED:[A-Za-z0-9_-]+\]/g, (t) => `\`${t}\``))).join('')
}

/**
 * Markdown cho nội dung KHÔNG TIN CẬY (do mô hình / công cụ sinh ra):
 * không HTML thô (react-markdown hiện thành chữ), không ảnh / iframe / script, liên kết chỉ http(s)/mailto,
 * mở tab mới với rel="noopener noreferrer" và hiện đích thật; khối code chỉ là chữ.
 */
export function SafeMarkdown({ text, q = '' }: { text: string; q?: string }) {
  const components = useMemo<Components>(() => {
    const hl = (c: ReactNode) => (q ? Children.map(c, (x) => (typeof x === 'string' ? <Hl text={x} q={q} /> : x)) : c)
    const wrap = (Tag: 'p' | 'li' | 'strong' | 'em' | 'del' | 'h1' | 'h2' | 'h3' | 'h4' | 'td' | 'th') => ({ children }: { children?: ReactNode }) => <Tag>{hl(children)}</Tag>
    return {
      p: wrap('p'), li: wrap('li'), strong: wrap('strong'), em: wrap('em'), del: wrap('del'), h1: wrap('h1'), h2: wrap('h2'), h3: wrap('h3'), h4: wrap('h4'), td: wrap('td'), th: wrap('th'),
      a: ({ href, children }) => (href
        ? <a href={href} target="_blank" rel="noopener noreferrer" title={`Mở ${href}`} className="text-brand underline">{hl(children)}<span className="text-xs text-slate-600"> ↗ {host(href)}</span></a>
        : <span title="Liên kết không an toàn đã bị chặn" className="underline decoration-dotted">{hl(children)}</span>),
      img: ({ alt }) => <span className="italic text-slate-600">[ảnh: {alt || 'không có mô tả'}]</span>, // không bao giờ nạp ảnh từ nội dung không tin cậy
      code: ({ children }) => {
        const s = String(children)
        return /^\[REDACTED:[A-Za-z0-9_-]+\]$/.test(s) ? <RedactedBadge label={s} /> : <code>{s.split(/(\[REDACTED:[A-Za-z0-9_-]+\])/g).map((p, i) => (/^\[REDACTED:/.test(p) ? <RedactedBadge key={i} label={p} /> : <Hl key={i} text={p} q={q} />))}</code>
      },
    }
  }, [q])
  return (
    <div className="md break-words">
      <Markdown urlTransform={(u) => (SAFE_URL.test(u) ? u : '')} components={components}>{markRedacted(text.normalize('NFC'))}</Markdown>
    </div>
  )
}
