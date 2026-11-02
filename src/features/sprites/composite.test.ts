import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Clip, SpriteProvider } from './provider.ts'
import { CompositeProvider } from './provider.ts'
import type { CharacterLayerDef } from './manifest.ts'

const clip = (source: Clip['source']): Clip => ({ textures: [], fps: 1, scale: 1, anchor: [0.5, 1], offsetPx: [0, 0], source })
const L = (id: string, kind: CharacterLayerDef['kind'], order = 0, prebuilt = false): CharacterLayerDef => ({ id, kind, style: 's', atlas: 'a', tintable: true, order, prebuilt, pack: 'p' })
const fake = (layers: CharacterLayerDef[], source: Clip['source'], has: (k: string) => boolean = () => true): SpriteProvider => ({
  layers: () => layers,
  hasAnim: (a) => has(`${layers[0]?.id}/${a}_down`),
  clip: (l, a, d) => (has(`${l}/${a}_${d}`) ? clip(source) : null),
  prop: (k, s) => (has(`prop:${k}/${s}`) ? clip(source) : null),
  tile: (p) => (has(`tile:${p}`) ? { texture: {} as never, tintable: true, scale: 1 } : null),
})
const proc = fake([L('proc_body', 'body', 0), L('proc_outfit', 'outfit', 10), L('proc_hair', 'hair', 20)], 'procedural')

test('không có atlas: dùng toàn bộ lớp và clip procedural', () => {
  const c = new CompositeProvider(null, proc)
  assert.deepEqual(c.layers().map((l) => l.id), ['proc_body', 'proc_outfit', 'proc_hair'])
  assert.equal(c.clip('proc_body', 'walk', 'down')?.source, 'procedural')
  assert.deepEqual(c.missing(), [])
})

test('atlas thiếu đúng một khung: chỉ khung đó lùi về hình tạm, và chỉ ghi nhận một lần', () => {
  const warn = console.warn
  let warned = 0
  console.warn = () => { warned++ }
  try {
    const atlas = fake([L('body_a', 'body')], 'atlas', (k) => k !== 'body_a/walk_up')
    const c = new CompositeProvider(atlas, proc)
    assert.deepEqual(c.layers().map((l) => l.id), ['body_a', 'proc_outfit', 'proc_hair']) // chỉ thay lớp body, outfit/hair giữ hình tạm
    assert.equal(c.clip('body_a', 'walk', 'down')?.source, 'atlas')
    assert.equal(c.clip('body_a', 'walk', 'up')?.source, 'procedural')
    c.clip('body_a', 'walk', 'up')
    assert.deepEqual(c.missing(), ['body_a/walk_up'])
    assert.equal(warned, 1)
  } finally { console.warn = warn }
})

test('đồ vật và ô sàn thiếu trong atlas lùi về hình tạm', () => {
  const warn = console.warn
  console.warn = () => {}
  try {
    const c = new CompositeProvider(fake([], 'atlas', () => false), fake([], 'procedural'))
    assert.equal(c.prop('desk', 'default')?.source, 'procedural')
    assert.ok(c.tile('wood'))
    assert.deepEqual(c.missing(), ['prop:desk/default', 'tile:wood'])
  } finally { console.warn = warn }
})

test('hasAnim: không atlas thì hình tạm luôn đủ; có atlas thì hỏi atlas', () => {
  assert.equal(new CompositeProvider(null, proc).hasAnim('sit_error'), true)
  const atlas = fake([L('body_a', 'body')], 'atlas', (k) => k !== 'body_a/sit_error_down')
  const c = new CompositeProvider(atlas, proc)
  assert.equal(c.hasAnim('sit_error'), false)
  assert.equal(c.hasAnim('sit_hand'), true)
})

test('atlas có lớp tóc thật: hair thật thay hair tạm, đúng thứ tự order; lớp prebuilt thì không thêm hình tạm', () => {
  const real = fake([L('body_a', 'body', 0), L('hair_a', 'hair', 20)], 'atlas')
  assert.deepEqual(new CompositeProvider(real, proc).layers().map((l) => l.id), ['body_a', 'proc_outfit', 'hair_a'])
  const pre = fake([L('avatar', 'body', 0, true)], 'atlas')
  assert.deepEqual(new CompositeProvider(pre, proc).layers().map((l) => l.id), ['avatar'])
})
