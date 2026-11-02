import assert from 'node:assert/strict'
import { test } from 'node:test'
import { initDraft, problems, toInstantiate } from './wizardLogic.ts'

const emailTool = { id: 'email_send', name: 'Gửi thư', risk: 'EXTERNAL', enabled: true, requiresAdminFlag: false, adminFlagOn: false, scopeSchema: { required: ['account', 'allowedDomains'], properties: { account: { type: 'string' }, allowedDomains: { type: 'array', items: { type: 'string' }, default: [] }, dailyLimit: { type: 'integer', default: 10, minimum: 1 } } } } as never
const moneyTool = { id: 'payment_transfer', name: 'Chuyển tiền', risk: 'MONEY', enabled: true, requiresAdminFlag: true, adminFlagOn: false, scopeSchema: {} } as never
const tpl = { id: 't', name: 'Sales', variables: [{ key: 'company', label: 'Công ty', default: '', required: true }], suggestedTools: [{ toolId: 'email_send', scope: {} }, { toolId: 'payment_transfer', scope: {} }], modelRequirement: { preferLocal: true, needsToolUse: false, minTier: null } } as never

test('khởi tạo: mọi công cụ đề xuất đều TẮT, phạm vi mặc định thận trọng, riêng tư theo mẫu', () => {
  const d = initDraft(tpl, [emailTool, moneyTool], 'qwen', true)
  assert.deepEqual(Object.values(d.picks).map((p) => p.on), [false, false])
  assert.deepEqual(d.picks.email_send.scope, { allowedDomains: [], dailyLimit: 10 })
  assert.equal(d.privacy, 'LOCAL_ONLY'); assert.equal(initDraft(tpl, [emailTool], 'sonnet', false).privacy, 'ANY')
})
test('mẫu ĐÃ NHẬP không được điền sẵn phạm vi (có thể cài miền độc hại)', () => {
  const imp = { ...(tpl as object), kind: 'IMPORTED', suggestedTools: [{ toolId: 'email_send', scope: { allowedDomains: ['evil.com'] } }] } as never
  assert.deepEqual(initDraft(imp, [emailTool], 'x', false).picks.email_send.scope, { allowedDomains: [], dailyLimit: 10 })
  assert.deepEqual(initDraft({ ...(imp as object), kind: 'BUILTIN' } as never, [emailTool], 'x', false).picks.email_send.scope, { allowedDomains: ['evil.com'], dailyLimit: 10 })
})
test('chưa tick công cụ nào thì không gửi quyền nào', () => {
  const d = initDraft(tpl, [emailTool, moneyTool], 'qwen', true); d.name = 'S'; d.role = 'R'; d.vars.company = 'X'
  assert.deepEqual(problems(d, tpl, [emailTool, moneyTool]), []); assert.deepEqual(toInstantiate(d).grants, [])
})
test('tick email_send mà chưa điền phạm vi -> báo lỗi bước 3; điền xong thì gửi đúng công cụ đã tick', () => {
  const tools = [emailTool, moneyTool], d = initDraft(tpl, tools, 'qwen', true); d.name = 'S'; d.role = 'R'; d.vars.company = 'X'; d.picks.email_send.on = true
  assert.deepEqual(problems(d, tpl, tools).map((p) => p.step), [3])
  d.picks.email_send.scope = { account: 's2', allowedDomains: ['acme.com'], dailyLimit: 5 }
  assert.deepEqual(problems(d, tpl, tools), []); assert.deepEqual(toInstantiate(d).grants.map((g) => g.toolId), ['email_send'])
})
test('công cụ rủi ro cao bị khoá thì chặn; thiếu tên / biến bắt buộc / ngân sách sai -> bước 1', () => {
  const tools = [emailTool, moneyTool], d = initDraft(tpl, tools, 'qwen', true); d.picks.payment_transfer.on = true; d.budgetUsd = '-3'
  const p = problems(d, tpl, tools)
  assert.ok(p.some((x) => x.step === 3 && /bị khoá/.test(x.text))); assert.equal(p.filter((x) => x.step === 1).length, 4)
})
test('ngân sách USD -> micro-USD nguyên; quyền dữ liệu "Không" bị bỏ', () => {
  const d = initDraft(tpl, [emailTool], 'qwen', true); d.budgetUsd = '1.5'; d.collections = { c1: 'READ', c2: 'NONE' }
  const i = toInstantiate(d); assert.equal(i.dailyBudgetMicro, 1_500_000); assert.deepEqual(i.collections, [{ collectionId: 'c1', access: 'READ' }])
})
