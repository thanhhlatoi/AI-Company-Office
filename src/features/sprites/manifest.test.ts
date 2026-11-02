import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EMPTY_MANIFEST, parseManifest } from './manifest.ts'

const pack = { id: 'p1', name: 'Pack', author: 'A', sourceUrl: 'https://x', license: 'CC0', attributionRequired: false }
const layer = { id: 'body_a', kind: 'body', style: 'a', atlas: 'sprites/characters/body_a.json', order: 0, pack: 'p1' }

test('manifest tối thiểu hợp lệ và có mặc định', () => {
  assert.equal(EMPTY_MANIFEST.tileSize, 32)
  assert.equal(EMPTY_MANIFEST.assetScale, 1)
  assert.equal(EMPTY_MANIFEST.animations.sit_type.frames, 4)
})

test('manifest đầy đủ hợp lệ', () => {
  const m = parseManifest({ version: 1, packs: [pack], characterLayers: [layer], props: [{ catalogKey: 'desk', atlas: 'a.json', frame: 'desk' }] })
  assert.equal(m.characterLayers[0].tintable, false)
  assert.deepEqual(m.props[0].anchor, [0, 1])
})

test('manifest sai: assetScale, thiếu pack, prop không có khung', () => {
  assert.throws(() => parseManifest({ version: 1, assetScale: 3 }), /assetScale/)
  assert.throws(() => parseManifest({ version: 1, characterLayers: [layer] }), /packs|chưa khai báo/)
  assert.throws(() => parseManifest({ version: 1, props: [{ catalogKey: 'x', atlas: 'a.json' }] }), /prop cần/)
  assert.throws(() => parseManifest({}), /version/)
})
