import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatDuration } from './time.ts'

test('formatDuration dạng "2 giờ 5 phút"', () => {
  assert.equal(formatDuration(0), '0 giây')
  assert.equal(formatDuration(45_000), '45 giây')
  assert.equal(formatDuration(125_000), '2 phút 5 giây')
  assert.equal(formatDuration(7_500_000), '2 giờ 5 phút')
  assert.equal(formatDuration(3 * 86_400_000 + 4 * 3_600_000), '3 ngày 4 giờ')
})
