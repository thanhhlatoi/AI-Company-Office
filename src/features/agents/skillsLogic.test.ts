import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { HermesSkill } from '../../types/hermes.ts'
import { bulkChange, contentChanged, countEnabled, groupSkills } from './skillsLogic.ts'

const s = (name: string, category: string, enabled: boolean, description?: string): HermesSkill => ({ name, category, enabled, path: `${category}/${name}`, description })
const SK = [s('obsidian', 'note-taking', false, 'Đọc ghi ghi chú'), s('github', 'devops', false), s('ytb-download', '', true), s('hermes-agent', 'autonomous-ai-agents', true)]

test('gom nhóm: skill tự tạo đứng đầu, các nhóm còn lại theo tên', () => {
  const g = groupSkills(SK, '')
  assert.deepEqual(g.map((x) => x.label), ['Tự tạo', 'autonomous-ai-agents', 'devops', 'note-taking'])
  assert.equal(g[0].enabled, 1)
})

test('tìm kiếm không phân biệt dấu và hoa thường, trong cả mô tả; nhóm rỗng bị bỏ', () => {
  assert.deepEqual(groupSkills(SK, 'GHI CHU').map((x) => x.items[0].name), ['obsidian'])
  assert.deepEqual(groupSkills(SK, 'devops').map((x) => x.label), ['devops'])
  assert.deepEqual(groupSkills(SK, 'khong-co'), [])
})

test('đếm skill đang bật', () => assert.equal(countEnabled(SK), 2))

test('bật/tắt hàng loạt chỉ gửi skill đang khác trạng thái', () => {
  assert.deepEqual(bulkChange(SK, false), { 'ytb-download': false, 'hermes-agent': false })
  assert.deepEqual(bulkChange(SK, true), { obsidian: true, github: true })
  assert.deepEqual(bulkChange([], true), {})
})

test('so nội dung bỏ qua khác biệt CRLF', () => {
  assert.equal(contentChanged('a\nb', 'a\r\nb'), false)
  assert.equal(contentChanged('a', 'a '), true)
})
