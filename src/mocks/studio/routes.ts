import { ApiError } from '../../api/http'
import type { PermissionChange } from '../../types/tools'
import { mockDb } from '../db'
import { audit, grants, nextGrantId, secrets, tools } from './toolsData'
import { checkCall, effectiveAll, effectiveOf } from './permissions'
import { logPage, lint, studioOf, versionsOf } from './logsData'
import { modelList, policyOf, resolvePolicy, rules, simulate } from './modelsData'
import { chunksOf, collections, documents, evalSets, recount, search } from './knowledgeData'
import { memoryPage, namespaces, recountNs } from './memoryData'
import { templates } from './templatesData'
import { studioWrite } from './routesWrite'
import { toolsWrite } from './routesTools'
import { modelsRoute } from './routesModels'
import { knowledgeRoute } from './routesKnowledge'
import { memoryRoute } from './routesMemory'
import { templatesRoute } from './routesTemplates'

const page = <T,>(rows: T[], q: URLSearchParams) => {
  const size = Number(q.get('limit') ?? 40), at = Number(q.get('cursor') ?? 0)
  return { items: rows.slice(at, at + size), nextCursor: at + size < rows.length ? String(at + size) : null }
}
const notFound = (what: string): never => { throw new ApiError(404, `Mock 404: không có ${what}`) }

/** Mock BE của Prompt 4D (đọc + xem trước + thử quyền). Ghi được thêm ở các bước sau. undefined = không phải route này. */
export function studioRequest(method: string, rawPath: string, body: unknown): unknown {
  const [path, query = ''] = rawPath.split('?')
  const q = new URLSearchParams(query)
  const b = (body ?? {}) as Record<string, unknown>
  let m: RegExpMatchArray | null
  const written = studioWrite(method, path, body) ?? toolsWrite(method, path, body) ?? modelsRoute(method, path, body) ?? knowledgeRoute(method, path, body) ?? memoryRoute(method, path, body, q) ?? templatesRoute(method, path, body)
  if (written !== undefined) return written

  if (method === 'GET') {
    if (path === '/tools') return tools.map((t) => ({ ...t, agentCount: grants.filter((g) => g.toolId === t.id).length }))
    if (path === '/grants') return grants.filter((g) => !q.get('agentId') || g.agentId === q.get('agentId'))
    if (path === '/effective-permissions') return effectiveAll()
    if (path === '/tool-calls') return logPage(q)
    if (path === '/secrets') return secrets.map((s) => ({ ...s, usedBy: grants.filter((g) => g.scope.account === s.id || g.scope.channel === s.id).map((g) => ({ agentId: g.agentId, toolId: g.toolId })) }))
    if (path === '/permission-audit') return page(audit, q)
    if (path === '/models') return modelList()
    if (path === '/routing-rules') return rules
    if (path === '/collections') { recount(); return collections }
    if (path === '/memory') return memoryPage(q)
    if (path === '/memory/namespaces') { recountNs(); return namespaces }
    if (path === '/templates') return templates
    if ((m = path.match(/^\/agents\/([^/]+)\/(effective-permissions|model-policy|studio|prompt-versions)$/))) {
      if (!mockDb.agents.some((a) => a.id === m![1])) notFound(`agent ${m[1]}`)
      return { 'effective-permissions': () => effectiveOf(m![1]), 'model-policy': () => resolvePolicy(policyOf(m![1])), studio: () => studioOf(m![1]), 'prompt-versions': () => versionsOf(m![1]) }[m[2]]!()
    }
    if ((m = path.match(/^\/collections\/([^/]+)(?:\/(documents|search|eval))?$/))) {
      const col = collections.find((c) => c.id === m![1]) ?? notFound(`bộ sưu tập ${m[1]}`)
      if (!m[2]) return col
      if (m[2] === 'documents') return page(documents.filter((d) => d.collectionId === col.id).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)), q)
      if (m[2] === 'search') return search(col.id, q.get('q') ?? '', q.get('asAgent') ?? undefined)
      return evalSets.get(col.id) ?? { questions: [], runs: [] }
    }
    if ((m = path.match(/^\/documents\/([^/]+)\/chunks$/))) return page(chunksOf(documents.find((d) => d.id === m![1]) ?? notFound(`tài liệu ${m[1]}`)), q)
    if ((m = path.match(/^\/templates\/([^/]+)(\/agents)?$/))) {
      const t = templates.find((x) => x.id === m![1]) ?? notFound(`mẫu ${m[1]}`)
      return m[2] ? mockDb.agents.filter((a) => studioOf(a.id).templateId === t.id) : t
    }
    return undefined
  }

  if (method === 'POST') {
    if (path === '/prompt/lint') return lint(String(b.prompt ?? ''))
    if (path === '/routing/simulate') return simulate(String(b.agentId), b as { priority?: string; tokens?: number; dataClass?: string })
    if ((m = path.match(/^\/tools\/([^/]+)\/check$/))) return checkCall(m[1], String(b.agentId), (b.args ?? {}) as Record<string, unknown>)
    if ((m = path.match(/^\/agents\/([^/]+)\/permissions\/preview$/))) {
      const c = b as unknown as PermissionChange
      const next = grants.filter((g) => g.agentId !== m![1] || !c.remove.includes(g.toolId))
      for (const gi of c.grants) {
        const old = next.findIndex((g) => g.agentId === m![1] && g.toolId === gi.toolId)
        const g = { id: old >= 0 ? next[old].id : nextGrantId(), agentId: m[1], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...gi, secretId: gi.secretId ?? null, limits: { maxCallsPerTask: null, maxPerMinute: null, expiresAt: null, ...gi.limits } }
        if (old >= 0) next[old] = g; else next.push(g)
      }
      return effectiveOf(m[1], next)
    }
  }
  return undefined
}
