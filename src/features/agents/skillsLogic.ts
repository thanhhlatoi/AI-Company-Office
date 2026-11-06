import { foldVi } from '../../lib/text.ts'
import type { HermesSkill } from '../../types/hermes.ts'

export interface SkillGroup { category: string; label: string; items: HermesSkill[]; enabled: number }

/** Skill tự tạo (không nằm trong thư mục nhóm) gom vào một nhóm riêng, xếp trước các nhóm có sẵn. */
export const OWN_LABEL = 'Tự tạo'

export const countEnabled = (skills: readonly HermesSkill[]) => skills.filter((s) => s.enabled).length

/** Lọc theo ô tìm (tên, nhóm, mô tả; không phân biệt dấu/hoa thường) rồi gom theo nhóm. Nhóm rỗng bị bỏ. */
export function groupSkills(skills: readonly HermesSkill[], query: string): SkillGroup[] {
  const q = foldVi(query.trim())
  const hit = (s: HermesSkill) => !q || foldVi(`${s.name} ${s.category} ${s.description ?? ''}`).includes(q)
  const byCat = new Map<string, HermesSkill[]>()
  for (const s of skills) if (hit(s)) byCat.set(s.category, [...(byCat.get(s.category) ?? []), s])
  return [...byCat.entries()]
    .sort(([a], [b]) => (a === '' ? -1 : b === '' ? 1 : a.localeCompare(b)))
    .map(([category, items]) => ({
      category, label: category || OWN_LABEL, enabled: countEnabled(items),
      items: [...items].sort((x, y) => x.name.localeCompare(y.name)),
    }))
}

/** Phần việc bật/tắt hàng loạt: chỉ những skill đang khác trạng thái muốn đặt (không gửi thừa). */
export function bulkChange(items: readonly HermesSkill[], enable: boolean): Record<string, boolean> {
  return Object.fromEntries(items.filter((s) => s.enabled !== enable).map((s) => [s.name, enable]))
}

/** Có đổi gì so với bản đang lưu không (bỏ qua khác biệt cuối dòng do trình duyệt). */
export const contentChanged = (original: string, edited: string) => original.replace(/\r\n/g, '\n') !== edited.replace(/\r\n/g, '\n')
