import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatTokens, yesNo } from './modelInfo.ts'

test('formatTokens', () => {
  assert.equal(formatTokens(272000), '272K')
  assert.equal(formatTokens(128000), '128K')
  assert.equal(formatTokens(1048576), '1M')
  assert.equal(formatTokens(500), '500')
  assert.equal(formatTokens(null), '—')
})

test('yesNo: không báo khác với Không', () => {
  assert.equal(yesNo(true), 'Có')
  assert.equal(yesNo(false), 'Không')
  assert.equal(yesNo(undefined), '—')
})
