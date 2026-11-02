import assert from 'node:assert/strict'
import { test } from 'node:test'
import { approvalMessage, statusChangeMessage, summarize } from './announce.ts'

test('chỉ thông báo khi chuyển sang trạng thái quan trọng', () => {
  assert.equal(statusChangeMessage('Lan', 'WORKING', 'ERROR'), 'Lan: gặp lỗi')
  assert.equal(statusChangeMessage('Lan', 'IDLE', 'BLOCKED'), 'Lan: bị chặn')
  assert.equal(statusChangeMessage('Lan', 'IDLE', 'OFFLINE'), 'Lan: ngoại tuyến')
  assert.equal(statusChangeMessage('Lan', 'IDLE', 'WORKING'), null)
  assert.equal(statusChangeMessage('Lan', 'ERROR', 'ERROR'), null) // không đổi
  assert.equal(statusChangeMessage('Lan', undefined, 'ERROR'), null) // lần đầu thấy agent: không báo
  assert.equal(approvalMessage('Lan'), 'Lan: chờ duyệt')
})

test('summarize gộp, vừa phải', () => {
  assert.equal(summarize(['a', 'b']), 'a. b')
  assert.equal(summarize(['a', 'b', 'c', 'd', 'e']), 'a. b. c. Và 2 thông báo khác')
})
