import assert from 'node:assert/strict'
import { test } from 'node:test'
import { creditsOf } from './credits.ts'
import { parseManifest } from './manifest.ts'

test('ghi công: mỗi gói kèm các lớp nó cung cấp; gói không giấy phép giữ nguyên rỗng để trang cảnh báo', () => {
  const m = parseManifest({
    version: 1,
    packs: [{ id: 'a', name: 'A', author: 'X', sourceUrl: 'https://x', license: 'CC-BY 4.0', attributionRequired: true }, { id: 'b', name: 'B' }],
    characterLayers: [{ id: 'body_a', kind: 'body', style: 's', atlas: 'a.json', order: 0, pack: 'a' }, { id: 'hair_a', kind: 'hair', style: 's', atlas: 'a.json', order: 1, pack: 'a' }],
  })
  const rows = creditsOf(m)
  assert.deepEqual(rows[0].provides, ['body_a', 'hair_a'])
  assert.equal(rows[0].attributionRequired, true)
  assert.deepEqual([rows[1].license, rows[1].provides], ['', []])
})
