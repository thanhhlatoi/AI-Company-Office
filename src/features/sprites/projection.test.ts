import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cellAt, depthKey, gridToScreen, screenToGrid } from './projection.ts'

test('gridToScreen và screenToGrid là hai chiều của nhau', () => {
  for (const [gx, gy] of [[0, 0], [3, 7], [-2, 5], [2.5, 1.25]]) {
    const s = gridToScreen(gx, gy)
    assert.deepEqual(screenToGrid(s.x, s.y), { x: gx, y: gy })
  }
})

test('cellAt làm tròn xuống, kể cả toạ độ âm', () => {
  assert.deepEqual(cellAt(31.9, 32), { x: 0, y: 1 })
  assert.deepEqual(cellAt(-0.1, -32.1), { x: -1, y: -2 })
})

test('depthKey: đối tượng nằm thấp hơn trên màn hình thì lớn hơn; bias chỉnh nhỏ', () => {
  assert.ok(depthKey({ gy: 3, h: 1 }) > depthKey({ gy: 1, h: 1 }))
  assert.equal(depthKey({ gy: 2, h: 2 }), 128)
  assert.ok(depthKey({ gy: 2, h: 1 }, 1) > depthKey({ gy: 2, h: 1 }))
})
