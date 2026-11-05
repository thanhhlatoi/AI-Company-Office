import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MAX_SKILLS, MAX_SKILL_LEN, parseSkills } from './skills.ts'

test('tách, cắt khoảng trắng, bỏ rỗng và trùng không phân biệt hoa thường', () => {
  assert.deepEqual(parseSkills(' viết kịch bản ,  Tiếng   Việt;\n tiếng việt, ,React'), ['viết kịch bản', 'Tiếng Việt', 'React'])
  assert.deepEqual(parseSkills(''), [])
})

test('giới hạn số lượng và độ dài', () => {
  assert.equal(parseSkills(Array.from({ length: 30 }, (_, i) => `k${i}`).join(',')).length, MAX_SKILLS)
  assert.equal(parseSkills('x'.repeat(100))[0].length, MAX_SKILL_LEN)
})
