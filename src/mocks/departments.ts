import { ApiError } from '../api/http'
import { INFRA_SLUG, RESERVED_SLUGS, isPropKind } from '../config/departments'
import { slugify } from '../lib/text'
import type { Agent, DepartmentInput } from '../types'
import { mockDb, newId } from './db'

const bad = (status: number, msg: string): never => { throw new ApiError(status, `Mock ${status}: ${msg}`, { message: msg }) }

/** Kiểm tra body như BE thật sẽ làm, rồi chuẩn hoá. */
function clean(body: unknown): DepartmentInput {
  const b = (body ?? {}) as Partial<DepartmentInput>
  const name = String(b.name ?? '').trim()
  if (name.length < 2 || name.length > 40) bad(400, 'Tên phòng từ 2 đến 40 ký tự')
  if (!/^#[0-9a-fA-F]{6}$/.test(String(b.color ?? ''))) bad(400, 'Màu phải dạng #rrggbb')
  const props = [...new Set((b.props ?? []).filter(isPropKind))]
  const monitorsPerDesk = Math.min(3, Math.max(1, Math.round(Number(b.monitorsPerDesk) || 1)))
  return { name, icon: String(b.icon || 'building'), color: String(b.color).toLowerCase(), props, monitorsPerDesk, headName: b.headName?.trim() || undefined, headRole: b.headRole?.trim() || undefined }
}

/** Slug từ tên; trùng thì thêm -2, -3... */
function freeSlug(name: string) {
  const base = slugify(name) || 'phong-ban'
  const taken = new Set([...RESERVED_SLUGS, ...mockDb.departments.map((d) => d.slug)])
  let slug = base
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`
  return slug
}

/** GET/POST /departments, PUT/DELETE /departments/:id. undefined = không phải route này. */
export function departmentCrud(method: string, path: string, body: unknown): unknown {
  if (path === '/departments') {
    if (method === 'GET') return mockDb.departments
    if (method !== 'POST') return undefined
    const input = clean(body)
    const id = newId()
    const order = Math.max(-1, ...mockDb.departments.map((d) => d.order)) + 1
    const dept = { id, name: input.name, slug: freeSlug(input.name), icon: input.icon, color: input.color, headAgentId: null as string | null, order, props: input.props, monitorsPerDesk: input.monitorsPerDesk }
    if (input.headName) {
      const head: Agent = {
        id: newId(), name: input.headName, role: input.headRole || `Trưởng phòng ${input.name}`, model: 'claude-sonnet-5-5',
        systemPrompt: `Bạn là ${input.headName} (trưởng phòng) thuộc phòng ${input.name}.`, color: input.color,
        status: 'IDLE', currentTask: null, departmentId: id, isHead: true, runsOnDeviceId: null, skills: [],
      }
      mockDb.agents.push(head)
      dept.headAgentId = head.id
    }
    mockDb.departments.push(dept)
    return dept
  }
  const m = path.match(/^\/departments\/([^/]+)$/)
  if (!m || (method !== 'PUT' && method !== 'DELETE')) return undefined
  const dept = mockDb.departments.find((d) => d.id === m[1]) ?? bad(404, `không có phòng ${m[1]}`)
  if (method === 'PUT') {
    const input = clean(body) // slug giữ nguyên để URL cũ không gãy
    Object.assign(dept, { name: input.name, icon: input.icon, color: input.color, props: input.props, monitorsPerDesk: input.monitorsPerDesk })
    return dept
  }
  if (dept.slug === INFRA_SLUG) bad(409, 'Phòng Hạ tầng gắn với khu thiết bị nên không xoá được')
  // Agent không bị xoá: về "Chưa phân phòng", và không còn là trưởng phòng
  for (const a of mockDb.agents) if (a.departmentId === dept.id) { a.departmentId = null; a.isHead = false }
  mockDb.departments.splice(mockDb.departments.indexOf(dept), 1)
  return null
}
