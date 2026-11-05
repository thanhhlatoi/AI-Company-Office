export const MAX_SKILLS = 12
export const MAX_SKILL_LEN = 30

/** "viết kịch bản, Tiếng Việt" -> ['viết kịch bản', 'Tiếng Việt']. Tách theo , ; xuống dòng; bỏ rỗng và trùng (không phân biệt hoa thường); cắt theo giới hạn. */
export function parseSkills(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of text.split(/[,;\n]/)) {
    const s = raw.trim().replace(/\s+/g, ' ').slice(0, MAX_SKILL_LEN)
    const k = s.toLocaleLowerCase('vi')
    if (!s || seen.has(k)) continue
    seen.add(k)
    out.push(s)
    if (out.length === MAX_SKILLS) break
  }
  return out
}
