import assert from 'node:assert/strict'
import { test } from 'node:test'
import { reorder, reorderPages } from './reorder.ts'

test('reorder', () => {
  assert.deepEqual(reorder(['a', 'b', 'c', 'd'], 'd', 'b'), ['a', 'd', 'b', 'c'])
  assert.deepEqual(reorder(['a', 'b', 'c', 'd'], 'a', null), ['b', 'c', 'd', 'a'])
  assert.deepEqual(reorder(['a', 'b', 'c'], 'b', 'zzz'), ['a', 'b', 'c']) // không có điểm đặt: giữ nguyên
})

test('reorderPages giữ kích thước trang', () => {
  const pages = [{ items: [{ id: 'a' }, { id: 'b' }], total: 4 }, { items: [{ id: 'c' }, { id: 'd' }], total: 4 }]
  const out = reorderPages(pages, 'd', 'a')
  assert.deepEqual(out.map((p) => p.items.map((x) => x.id)), [['d', 'a'], ['b', 'c']])
  assert.equal(out[0].total, 4)
})
