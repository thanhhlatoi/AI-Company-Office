import assert from 'node:assert/strict'
import { test } from 'node:test'
import { diffStats, lineDiff } from './diff.ts'

test('giống nhau -> toàn dòng same', () => {
  const d = lineDiff('a\nb', 'a\nb')
  assert.deepEqual(d.map((x) => x.kind), ['same', 'same'])
  assert.deepEqual(diffStats(d), { added: 0, removed: 0 })
})

test('thêm, xoá, sửa một dòng', () => {
  const d = lineDiff('một\nhai\nba', 'một\nHAI\nba\nbốn')
  assert.deepEqual(d.map((x) => `${x.kind}:${x.text}`), ['same:một', 'del:hai', 'add:HAI', 'same:ba', 'add:bốn'])
  assert.deepEqual(diffStats(d), { added: 2, removed: 1 })
})

test('số dòng hai phía khớp bản gốc', () => {
  const d = lineDiff('x\ny\nz', 'y\nz\nw')
  assert.deepEqual(d.filter((l) => l.a).map((l) => l.text), ['x', 'y', 'z'])
  assert.deepEqual(d.filter((l) => l.b).map((l) => l.text), ['y', 'z', 'w'])
})

test('rỗng', () => assert.deepEqual(lineDiff('', ''), [{ kind: 'same', text: '', a: 1, b: 1 }]))
