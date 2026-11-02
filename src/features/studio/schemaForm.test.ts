import assert from 'node:assert/strict'
import { test } from 'node:test'
import { defaultScope, fieldsOf, validateScope } from './schemaForm.ts'

const schema = {
  type: 'object', required: ['account', 'allowedDomains'],
  properties: {
    account: { type: 'string', title: 'Tài khoản', 'x-secretKind': 'email' },
    allowedDomains: { type: 'array', items: { type: 'string' }, title: 'Miền', default: [] },
    dailyLimit: { type: 'integer', title: 'Mỗi ngày', default: 10, minimum: 1, maximum: 100 },
    mode: { type: 'string', enum: ['a', 'b'] }, flag: { type: 'boolean' }, nested: { type: 'object' },
  },
}

test('suy ra loại trường', () => assert.deepEqual(fieldsOf(schema).map((f) => f.kind), ['secret', 'list', 'integer', 'enum', 'boolean', 'json']))
test('mặc định thận trọng: chỉ lấy default khai báo, trường bắt buộc không default để trống', () => assert.deepEqual(defaultScope(schema), { allowedDomains: [], dailyLimit: 10 }))
test('bắt buộc: thiếu tài khoản và danh sách rỗng', () => assert.deepEqual(validateScope(schema, defaultScope(schema)), { account: 'Bắt buộc', allowedDomains: 'Cần ít nhất một mục' }))
test('hợp lệ', () => assert.deepEqual(validateScope(schema, { account: 's1', allowedDomains: ['acme.com'], dailyLimit: 5 }), {}))
test('số: ngoài khoảng, không nguyên, không phải số', () => {
  const ok = { account: 's1', allowedDomains: ['x'] }
  assert.equal(validateScope(schema, { ...ok, dailyLimit: 0 }).dailyLimit, 'Tối thiểu 1')
  assert.equal(validateScope(schema, { ...ok, dailyLimit: 101 }).dailyLimit, 'Tối đa 100')
  assert.equal(validateScope(schema, { ...ok, dailyLimit: 2.5 }).dailyLimit, 'Phải là số nguyên')
  assert.equal(validateScope(schema, { ...ok, dailyLimit: 'abc' }).dailyLimit, 'Phải là số')
})
