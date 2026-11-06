/** Bỏ dấu tiếng Việt + chữ thường: "Kế toán" -> "ke toan". Dùng cho tìm kiếm không dấu. */
export const foldVi = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase()

/** "Nhân sự & Tuyển dụng" -> "nhan-su-tuyen-dung" (dùng làm slug trên URL). */
export const slugify = (s: string) => foldVi(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

/** Tách `text` thành các đoạn khớp / không khớp `query` (không dấu, không phân biệt hoa thường). Chữ gốc được giữ nguyên. */
export function splitMatches(text: string, query: string): { text: string; hit: boolean }[] {
  const n = foldVi(query.trim())
  if (!n) return [{ text, hit: false }]
  const hay = foldVi(text) // cùng độ dài với `text` khi text là chữ dựng sẵn (NFC)
  const out: { text: string; hit: boolean }[] = []
  let at = 0
  for (let i = hay.indexOf(n); i >= 0; i = hay.indexOf(n, at)) {
    if (i > at) out.push({ text: text.slice(at, i), hit: false })
    out.push({ text: text.slice(i, i + n.length), hit: true })
    at = i + n.length
  }
  if (at < text.length) out.push({ text: text.slice(at), hit: false })
  return out.length ? out : [{ text, hit: false }]
}

/** Ước lượng số token từ độ dài chữ (≈ 3,5 ký tự / token); chỉ để hiển thị, BE mới là bên đếm thật. */
export const estimateTokens = (s: string) => Math.ceil(s.length / 3.5)
