// Đẩy phòng ban + agent từ config/departments.ts (nguồn của mock) lên BE thật. Chạy lại nhiều lần vẫn an toàn:
// phòng có sẵn (theo slug) thì cập nhật, agent đã có (cùng tên, cùng phòng) thì bỏ qua.
//
//   npx rolldown tools/seed-be.ts --file dist-tools/seed-be.mjs --format esm --platform node
//   SEED_BE=http://localhost:8082/api/fe node dist-tools/seed-be.mjs [--dry]
import { DEPARTMENTS, type Member } from '../src/config/departments.ts'
import { PALETTES } from '../src/styles/tokens.ts'

const BE = process.env.SEED_BE ?? 'http://localhost:8082/api/fe'
const MODEL = process.env.SEED_MODEL ?? 'local.small'
const DRY = process.argv.includes('--dry')
const SHIRTS = ['#4f46e5', '#0ea5e9', '#14b8a6', '#f59e0b', '#ec4899', '#84cc16', '#f43f5e', '#7c3aed']

interface Dept { id: string; slug: string; name: string; headAgentId?: string | null }
interface Ag { id: string; name: string; departmentId?: string | null }

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(BE + path, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text.slice(0, 300)}`)
  return (text ? JSON.parse(text) : null) as T
}

const prompt = (m: Member, dept: string, head: boolean) =>
  `Bạn là ${m.name} (${m.role}) thuộc phòng ${dept}.${head ? ' Bạn là trưởng phòng: chia việc cho nhân viên và duyệt kết quả.' : ''}`

let seq = 0
let created = 0, updated = 0, skipped = 0
const depts = await api<Dept[]>('GET', '/departments')
const agents = await api<Ag[]>('GET', '/agents')

for (const cfg of DEPARTMENTS.filter((d) => d.enabled)) {
  const accent = PALETTES[cfg.palette].accent
  const input = {
    name: cfg.name, slug: cfg.slug, icon: cfg.icon, color: accent, props: cfg.props, monitorsPerDesk: cfg.monitorsPerDesk,
    headName: cfg.head.name, headRole: cfg.head.role,
  }
  let dept = depts.find((d) => d.slug === cfg.slug)
  const existed = !!dept
  console.log(`${dept ? 'cập nhật' : 'tạo'} phòng ${cfg.name} (${cfg.slug})`)
  if (!DRY) {
    dept = dept ? await api<Dept>('PUT', `/departments/${dept.id}`, input) : await api<Dept>('POST', '/departments', input)
    if (existed) updated++; else created++
  }
  const members: [Member, boolean][] = [[cfg.head, true], ...cfg.staff.map((m): [Member, boolean] => [m, false])]
  for (const [m, isHead] of members) {
    seq++
    const color = isHead ? accent : SHIRTS[seq % SHIRTS.length]
    const body = { name: m.name, role: m.role, systemPrompt: prompt(m, cfg.name, isHead), model: MODEL, color, departmentId: dept?.id, skills: m.skills ?? [] }
    if (isHead) {
      // trưởng phòng đã được tạo cùng phòng: chỉ bổ sung system prompt, màu, kỹ năng
      if (dept?.headAgentId && !DRY) { await api('PUT', `/agents/${dept.headAgentId}`, body); console.log(`  cập nhật trưởng phòng ${m.name}`) }
      continue
    }
    if (agents.some((a) => a.name === m.name && a.departmentId === dept?.id)) { skipped++; continue }
    console.log(`  tạo agent ${m.name}`)
    if (!DRY) { const a = await api<Ag>('POST', '/agents', body); agents.push(a); created++ }
  }
}
console.log(`xong: tạo ${created}, cập nhật phòng ${updated}, bỏ qua ${skipped}${DRY ? ' (chạy thử, chưa ghi gì)' : ''}`)
