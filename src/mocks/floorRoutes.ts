import { generateFloors, generateLayout, type DeptInput } from '../features/floor/layoutGen'
import { paletteFor } from '../styles/tokens'
import type { Floor, Layout } from '../types/floor'
import type { Department } from '../types'
import { mockDb } from './db'

const deptInput = (d: Department): DeptInput => {
  const p = paletteFor(d.color)
  const members = mockDb.agents.filter((a) => a.departmentId === d.id).sort((a, b) => Number(b.isHead) - Number(a.isHead))
  return { id: d.id, slug: d.slug, name: d.name, floor: p.floor, wall: p.wall, deviceIds: d.slug === 'ha-tang' ? ['server', 'nas'] : undefined, members: members.map((a) => ({ id: a.id, isHead: a.isHead })) }
}

let cache: { floors: Floor[]; layouts: Map<string, Layout> } | null = null

/** GET /floors, GET /floors/:slug/layout, POST /floors/:slug/layout/regenerate (xem docs/MISSING_API.md mục K). undefined = không phải route tầng. */
export function floorRequest(method: string, fullPath: string): unknown {
  const [path, qs = ''] = fullPath.split('?')
  const m = /^\/floors(?:\/([^/]+)\/layout(\/regenerate)?)?$/.exec(path)
  if (!m) return undefined
  if (!cache) {
    const { floors, layouts } = generateFloors([...mockDb.departments].sort((a, b) => a.order - b.order).map(deptInput), 3)
    cache = { floors, layouts: new Map(layouts.map((l) => [l.floorSlug, l])) }
  }
  if (!m[1]) return cache.floors
  const layout = cache.layouts.get(m[1])
  if (!layout) throw new Error(`Mock 404: không có tầng ${m[1]}`)
  if (m[2] && method === 'POST') {
    const depts = mockDb.departments.filter((d) => layout.rooms.some((r) => r.departmentId === d.id)).map(deptInput)
    const fresh = generateLayout(m[1], depts, layout.version + 1)
    cache.layouts.set(m[1], fresh)
    return fresh
  }
  if (new URLSearchParams(qs).get('broken') === '1') return { floorSlug: m[1], version: 'x', rooms: [{ rect: { w: 0 } }] } // thử trang lỗi bố cục
  return layout
}
