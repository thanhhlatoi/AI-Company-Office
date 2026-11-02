import assert from 'node:assert/strict'
import { test } from 'node:test'
import { RISK_ORDER, RISK_STYLE, hasRiskTriangle, isHighRisk, riskRank } from './risk.ts'

test('thứ tự rủi ro và mức cần xác nhận hai bước', () => {
  assert.deepEqual(RISK_ORDER.filter(isHighRisk), ['MONEY', 'DESTRUCTIVE'])
  assert.ok(riskRank('EXTERNAL') > riskRank('WRITE_INTERNAL'))
  for (const r of RISK_ORDER) assert.ok(RISK_STYLE[r].label && RISK_STYLE[r].color) // mỗi mức đủ chữ + màu
})

test('tam giác rủi ro chỉ khi đủ cả ba cạnh', () => {
  const t = { privateData: true, readsExternal: true, sendsOut: true }
  assert.equal(hasRiskTriangle(t), true)
  for (const k of ['privateData', 'readsExternal', 'sendsOut'] as const) assert.equal(hasRiskTriangle({ ...t, [k]: false }), false)
})
