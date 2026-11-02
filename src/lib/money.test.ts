import assert from 'node:assert/strict'
import { test } from 'node:test'
import { changePct, formatMoney, formatUsd, formatVnd, usdToMicro } from './money.ts'

test('usdToMicro làm tròn tới micro', () => {
  assert.equal(usdToMicro(0.0123), 12_300)
  assert.equal(usdToMicro(1.2345675), 1_234_568)
})

test('formatUsd đổi số chữ số theo độ lớn', () => {
  assert.equal(formatUsd(0), '$0')
  assert.equal(formatUsd(123), '$0.000123')
  assert.equal(formatUsd(12_300), '$0.0123')
  assert.equal(formatUsd(1_234_500), '$1.235')
  assert.equal(formatUsd(123_456_000), '$123.46')
  assert.equal(formatUsd(1_234_500_000), '$1,234.50')
  assert.equal(formatUsd(-12_300), '-$0.0123')
})

test('formatVnd và formatMoney', () => {
  assert.equal(formatVnd(12_800, 25_000), '≈ 320 đ')
  assert.equal(formatMoney(12_800, 0), '$0.0128')
  assert.equal(formatMoney(12_800, 25_000), '$0.0128 (≈ 320 đ)')
})

test('changePct', () => {
  assert.equal(changePct(150, 100), 50)
  assert.equal(changePct(50, 100), -50)
  assert.equal(changePct(10, 0), null)
})
