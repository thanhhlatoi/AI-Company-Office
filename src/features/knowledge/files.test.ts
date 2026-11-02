import assert from 'node:assert/strict'
import { test } from 'node:test'
import { describeError } from './errors.ts'
import { checkFile, fmtSize, MAX_BYTES } from './files.ts'

test('kiểm tra tệp trước khi tải lên', () => {
  assert.equal(checkFile('Hop dong.PDF', 1000), null)
  assert.match(checkFile('virus.exe', 1000) ?? '', /\.exe chưa được hỗ trợ/)
  assert.match(checkFile('khong-duoi', 1000) ?? '', /chưa được hỗ trợ/)
  assert.equal(checkFile('a.md', 0), 'Tệp rỗng')
  assert.match(checkFile('a.pdf', MAX_BYTES + 1) ?? '', /lớn hơn 50 MB/)
})
test('định dạng dung lượng', () => { assert.equal(fmtSize(2048), '2 KB'); assert.equal(fmtSize(5 * 1024 * 1024), '5.0 MB'); assert.equal(fmtSize(10), '1 KB') })
test('mã lỗi -> tiếng Việt, mã lạ vẫn có câu trả lời', () => {
  assert.match(describeError('PDF_SCANNED_NO_OCR').text, /PDF dạng ảnh/)
  assert.equal(describeError('PDF_SCANNED_NO_OCR').retry, true)
  assert.equal(describeError('VIRUS_DETECTED').retry, false)
  assert.match(describeError('X_LẠ').text, /mã X_LẠ/)
  assert.match(describeError(null).text, /không rõ/)
})
