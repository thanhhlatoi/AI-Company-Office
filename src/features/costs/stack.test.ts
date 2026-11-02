import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { UsageSummary } from '../../types/cost.ts'
import { stackSeries } from './stack.ts'

const row = (key: string, totalMicro: number) => ({ key, label: key.toUpperCase(), totalMicro, calls: 1, inputTokens: 0, outputTokens: 0 })
const u = { from: '', to: '', groupBy: 'agent', totalMicro: 60, calls: 3, inputTokens: 0, outputTokens: 0, unpricedCalls: 0,
  byDay: [{ day: '2026-11-01', totalMicro: 60, parts: { a: 30, b: 20, c: 10 } }], rows: [row('a', 30), row('b', 20), row('c', 10)] } as UsageSummary

test('stackSeries gộp phần còn lại thành "Khác" và giữ tổng', () => {
  const { series, data } = stackSeries(u, 2)
  assert.deepEqual(series.map((s) => s.key), ['a', 'b', 'other'])
  assert.deepEqual(data[0], { day: '2026-11-01', a: 30, b: 20, other: 10 })
  assert.equal(stackSeries(u, 5).series.length, 3) // đủ chỗ thì không có "Khác"
})
