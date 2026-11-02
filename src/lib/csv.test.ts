import assert from 'node:assert/strict'
import { test } from 'node:test'
import { toCsv } from './csv.ts'

test('toCsv thoát ký tự đặc biệt và chặn công thức', () => {
  assert.equal(toCsv([['Tên', 'Chi phí'], ['Kế toán, A', 1.5], ['Câu "hay"', 2]]), 'Tên,Chi phí\r\n"Kế toán, A",1.5\r\n"Câu ""hay""",2')
  assert.equal(toCsv([['=SUM(A1)', '-5']]), "'=SUM(A1),'-5")
  assert.equal(toCsv([[-5]]), '-5') // số âm là số, không phải công thức
})
