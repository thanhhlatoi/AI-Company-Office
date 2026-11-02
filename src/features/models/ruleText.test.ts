import assert from 'node:assert/strict'
import { test } from 'node:test'
import { describeWhen } from './ruleText.ts'

test('mô tả luật', () => {
  assert.equal(describeWhen({}), 'Mọi task (luật mặc định)')
  assert.equal(describeWhen({ priority: 'HIGH', maxTokens: 4000 }), 'Khi ưu tiên Cao, tối đa 4000 token')
  assert.equal(describeWhen({ minTokens: 20000 }), 'Khi từ 20000 token trở lên')
  assert.equal(describeWhen({ minTokens: 100, maxTokens: 900, dataClass: 'CONFIDENTIAL' }), 'Khi 100–900 token, dữ liệu Mật')
  assert.equal(describeWhen({ agentId: '7', departmentId: '2' }, { agent: () => 'Sales', department: () => 'Kinh doanh' }), 'Khi phòng Kinh doanh, agent Sales')
})
