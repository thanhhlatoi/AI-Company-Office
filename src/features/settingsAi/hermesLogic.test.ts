import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hermesBanner } from './hermesLogic.ts'
import { HermesAgentListSchema, HermesStatusSchema, SyncAllResultSchema } from '../../types/hermes.ts'

const ok = { reachable: true, agentsInOffice: 35, botsInHermes: 35, missing: 0, orphans: 0 }

test('banner: khớp thì không hiện', () => assert.equal(hermesBanner(ok), null))

test('banner: không kết nối là lỗi', () => assert.equal(hermesBanner({ ...ok, reachable: false })?.tone, 'error'))

test('banner: Hermes trống sau reset gợi ý đồng bộ lại tất cả, nêu số agent', () => {
  const b = hermesBanner({ ...ok, botsInHermes: 0, missing: 35 })
  assert.equal(b?.tone, 'warn')
  assert.match(b?.text ?? '', /chưa có bot nào/)
  assert.match(b?.text ?? '', /35 agent/)
})

test('banner: lệch một phần nêu cả thiếu và thừa', () => {
  assert.match(hermesBanner({ ...ok, botsInHermes: 30, missing: 5 })?.text ?? '', /5 agent thiếu bot/)
  const both = hermesBanner({ ...ok, missing: 2, orphans: 3 })?.text ?? ''
  assert.match(both, /2 agent thiếu bot, 3 bot thừa/)
  assert.match(hermesBanner({ ...ok, orphans: 1 })?.text ?? '', /1 bot thừa/)
})

test('banner: không có agent nào thì Hermes trống là bình thường', () => assert.equal(hermesBanner({ ...ok, agentsInOffice: 0, botsInHermes: 0 }), null))

test('schema Hermes: id số được đổi sang chuỗi; trạng thái lạ bị từ chối', () => {
  const rows = HermesAgentListSchema.parse([{ agentId: 15, name: 'Hermes', hermesBotId: null, syncState: 'NOT_SYNCED' }])
  assert.equal(rows[0].agentId, '15')
  assert.equal(HermesAgentListSchema.safeParse([{ agentId: '1', name: 'x', hermesBotId: null, syncState: 'WEIRD' }]).success, false)
  assert.equal(SyncAllResultSchema.parse({ created: 1, updated: 2, failed: [{ agentId: 3, error: 'x' }] }).failed[0].agentId, '3')
  assert.equal(HermesStatusSchema.safeParse({ reachable: true }).success, false)
})
