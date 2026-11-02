import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { asepriteToPixi, tagOrder, type AseExport } from './convert.ts'

const sample = JSON.parse(readFileSync(new URL('./sample.aseprite.json', import.meta.url), 'utf8')) as AseExport

test('tagOrder: các hướng chạy', () => {
  assert.deepEqual(tagOrder(0, 2), [0, 1, 2])
  assert.deepEqual(tagOrder(2, 4, 'reverse'), [4, 3, 2])
  assert.deepEqual(tagOrder(0, 2, 'pingpong'), [0, 1, 2, 1])
  assert.deepEqual(tagOrder(3, 3, 'pingpong'), [3])
})

test('tệp mẫu: khung đặt tên {tag}_{index}, có khoá animations, ảnh theo tên tệp', () => {
  const { sheet, warnings } = asepriteToPixi(sample)
  assert.deepEqual(sheet.animations.sit_type_down, ['sit_type_down_0', 'sit_type_down_1', 'sit_type_down_2', 'sit_type_down_3'])
  assert.deepEqual(sheet.animations.sit_hand_up, ['sit_hand_up_0', 'sit_hand_up_1', 'sit_hand_up_2'])
  assert.deepEqual(sheet.frames.sit_hand_up_0.frame, { x: 128, y: 0, w: 32, h: 48 }) // đảo chiều: khung nguồn #4 đứng đầu
  assert.deepEqual(sheet.frames.sit_type_down_3.frame, sheet.frames.sit_type_down_1.frame) // pingpong dùng lại khung nguồn #1
  assert.equal(sheet.meta.image, 'body_sample.png')
  assert.deepEqual(sheet.meta.size, { w: 192, h: 48 })
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /#5/)
})

test('hỗ trợ JSON dạng hash và ghi đè tên ảnh', () => {
  const hash: AseExport = { ...sample, frames: Object.fromEntries((sample.frames as { filename: string }[]).map((f) => [f.filename, f])) as AseExport['frames'] }
  assert.deepEqual(asepriteToPixi(hash, 'x.png').sheet.animations, asepriteToPixi(sample).sheet.animations)
  assert.equal(asepriteToPixi(hash, 'x.png').sheet.meta.image, 'x.png')
})

test('lỗi: thiếu thẻ, khoảng khung sai, trùng thẻ', () => {
  assert.throws(() => asepriteToPixi({ ...sample, meta: { ...sample.meta, frameTags: [] } }), /frameTags/)
  assert.throws(() => asepriteToPixi({ ...sample, meta: { ...sample.meta, frameTags: [{ name: 'stand_down', from: 0, to: 99 }] } }), /không hợp lệ/)
  const t = { name: 'stand_down', from: 0, to: 0 }
  assert.throws(() => asepriteToPixi({ ...sample, meta: { ...sample.meta, frameTags: [t, t] } }), /trùng/)
})

test('cảnh báo thẻ sai quy ước tên', () => {
  const r = asepriteToPixi({ ...sample, meta: { ...sample.meta, frameTags: [{ name: 'Walk Left', from: 0, to: 1 }] } })
  assert.ok(r.warnings.some((w) => w.includes('Walk Left')))
})
