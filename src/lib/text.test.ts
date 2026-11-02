import assert from 'node:assert/strict'
import { test } from 'node:test'
import { foldVi, splitMatches } from './text.ts'

test('foldVi bỏ dấu và đổi đ', () => {
  assert.equal(foldVi('Đối soát kế toán'), 'doi soat ke toan')
  assert.ok(foldVi('Kế toán trưởng').includes(foldVi('ke toan')))
})

test('foldVi giữ nguyên độ dài với chữ dựng sẵn (để định vị đoạn khớp)', () => {
  const s = 'Đối soát kế toán tháng 10'.normalize('NFC')
  assert.equal(foldVi(s).length, s.length)
})

test('splitMatches tìm không dấu, không phân biệt hoa/thường, giữ nguyên chữ gốc', () => {
  assert.deepEqual(splitMatches('Báo cáo Kế toán và kế TOÁN', 'ke toan'), [{ text: 'Báo cáo ', hit: false }, { text: 'Kế toán', hit: true }, { text: ' và ', hit: false }, { text: 'kế TOÁN', hit: true }])
  assert.deepEqual(splitMatches('abc', ''), [{ text: 'abc', hit: false }])
  assert.deepEqual(splitMatches('abc', 'zzz'), [{ text: 'abc', hit: false }])
})
