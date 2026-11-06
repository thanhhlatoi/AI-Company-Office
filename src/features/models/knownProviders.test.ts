import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mergeKnown, type KnownMap } from './knownProviders.ts'

const T0 = '2026-11-06T10:00:00Z', T1 = '2026-11-06T10:05:00Z'

test('lần đầu: mục live là hoạt động, được nhớ lại', () => {
  const { rows, next } = mergeKnown({}, [{ name: 'cx', modelCount: 20 }, { name: 'ollama', modelCount: 11 }], T0)
  assert.deepEqual(rows.map((r) => [r.name, r.active]), [['cx', true], ['ollama', true]])
  assert.equal(next.ollama.lastSeen, T0)
})

test('nhà cung cấp biến mất khỏi 9Router thì không hoạt động, giữ lastSeen cũ, xếp sau', () => {
  const known: KnownMap = { cx: { modelCount: 20, lastSeen: T0 }, ollama: { modelCount: 11, lastSeen: T0 } }
  const { rows } = mergeKnown(known, [{ name: 'cx', modelCount: 19 }], T1)
  assert.deepEqual(rows.map((r) => [r.name, r.active, r.modelCount, r.lastSeen]), [['cx', true, 19, T1], ['ollama', false, 11, T0]])
})

test('mất kết nối 9Router (live=null): tất cả không hoạt động, không ghi đè lastSeen', () => {
  const known: KnownMap = { cx: { modelCount: 20, lastSeen: T0 } }
  const { rows, next } = mergeKnown(known, null, T1)
  assert.equal(rows[0].active, false)
  assert.equal(next.cx.lastSeen, T0)
})

test('kết nối lại thì hoạt động trở lại', () => {
  const known: KnownMap = { cx: { modelCount: 20, lastSeen: T0 } }
  assert.equal(mergeKnown(known, [{ name: 'cx', modelCount: 20 }], T1).rows[0].active, true)
})
