import assert from 'node:assert/strict'
import { test } from 'node:test'
import { customRange, presetRange, previousRange } from './range.ts'

const NOW = Date.parse('2026-11-02T20:00:00Z') // 03:00 ngày 3/11 giờ VN

test('presetRange tính theo ngày giờ VN', () => {
  assert.deepEqual(presetRange('today', NOW), { from: '2026-11-02T17:00:00.000Z', to: '2026-11-03T17:00:00.000Z' })
  assert.equal(presetRange('7d', NOW).from, '2026-10-27T17:00:00.000Z')
  assert.equal(presetRange('month', NOW).from, '2026-10-31T17:00:00.000Z') // 1/11 00:00 giờ VN
})

test('previousRange liền trước và cùng độ dài', () => {
  const r = presetRange('7d', NOW)
  const p = previousRange(r)
  assert.equal(p.to, r.from)
  assert.equal(Date.parse(p.to) - Date.parse(p.from), Date.parse(r.to) - Date.parse(r.from))
})

test('customRange gồm cả ngày cuối, từ chối sai thứ tự', () => {
  assert.deepEqual(customRange('2026-11-01', '2026-11-02'), { from: '2026-10-31T17:00:00.000Z', to: '2026-11-02T17:00:00.000Z' })
  assert.equal(customRange('2026-11-05', '2026-11-01'), null)
  assert.equal(customRange('xxx', '2026-11-01'), null)
})
