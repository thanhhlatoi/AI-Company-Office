import assert from 'node:assert/strict'
import { test } from 'node:test'
import { describeChange, newGrant, touchesHighRisk } from './grantRules.ts'

const tools = [{ id: 'email_send', name: 'Gửi thư', risk: 'EXTERNAL' as const }, { id: 'payment_transfer', name: 'Chuyển tiền', risk: 'MONEY' as const }]
const eff = (list: object[], flags = {}) => ({ agentId: '1', tools: list, privateData: false, readsExternal: false, sendsOut: false, ...flags }) as never
const t = (toolId: string, extra = {}) => ({ toolId, allowed: true, risk: 'EXTERNAL', needsApproval: false, scopeSummary: '', expiresAt: null, blockedReason: null, ...extra })

test('thêm / bớt / đổi công cụ', () => {
  const before = eff([t('a', { scopeSummary: 'x' })]), after = eff([t('email_send', { scopeSummary: 'domain: acme.com', needsApproval: true })], { sendsOut: true })
  const lines = describeChange(before, after, tools)
  assert.ok(lines[0].startsWith('+ Dùng được "Gửi thư"') && lines[0].includes('chờ duyệt'))
  assert.ok(lines.includes('− Không còn dùng được "a"'))
  assert.ok(lines.includes('+ Bắt đầu gửi được thông tin ra ngoài'))
})
test('nới lỏng duyệt được nêu rõ', () => {
  const l = describeChange(eff([t('email_send', { needsApproval: true })]), eff([t('email_send', { needsApproval: false })]), tools)
  assert.ok(l[0].includes('KHÔNG còn bắt duyệt'))
})
test('không đổi', () => assert.deepEqual(describeChange(eff([]), eff([]), tools), ['Không có thay đổi về quyền.']))
test('đụng mức rủi ro cao', () => { assert.equal(touchesHighRisk(['email_send'], tools), false); assert.equal(touchesHighRisk(['email_send', 'payment_transfer'], tools), true) })
test('quyền mới: mặc định thận trọng, chưa bắt duyệt', () => {
  const g = newGrant({ id: 'email_send', scopeSchema: { properties: { allowedDomains: { type: 'array', items: { type: 'string' }, default: [] }, account: { type: 'string' } } } })
  assert.deepEqual(g.scope, { allowedDomains: [] }); assert.equal(g.alwaysApprove, false)
})
