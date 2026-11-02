// Mã lỗi xử lý tài liệu của BE -> câu tiếng Việt dễ hiểu + gợi ý. Không import gì: chạy được bằng `node --test`.
const MAP: Record<string, { text: string; retry: boolean }> = {
  PDF_SCANNED_NO_OCR: { text: 'PDF dạng ảnh, chưa bật OCR nên không trích được chữ.', retry: true },
  UNSUPPORTED_TYPE: { text: 'Định dạng tệp chưa được hỗ trợ.', retry: false },
  TOO_LARGE: { text: 'Tệp quá lớn để xử lý.', retry: false },
  ENCRYPTED: { text: 'Tệp bị đặt mật khẩu hoặc mã hoá nên không đọc được.', retry: false },
  EMPTY_TEXT: { text: 'Không tìm thấy chữ nào trong tệp.', retry: false },
  EXTRACT_TIMEOUT: { text: 'Trích xuất chữ quá thời gian chờ.', retry: true },
  EMBEDDING_FAILED: { text: 'Model embedding bị lỗi khi nhúng (có thể đang ngừng hoạt động).', retry: true },
  VIRUS_DETECTED: { text: 'Tệp bị chặn vì nghi chứa mã độc.', retry: false },
}
export function describeError(code: string | null | undefined): { text: string; retry: boolean } {
  if (!code) return { text: 'Lỗi không rõ.', retry: true }
  return MAP[code] ?? { text: `Lỗi xử lý (mã ${code}).`, retry: true }
}
