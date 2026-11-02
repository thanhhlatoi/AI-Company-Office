export const PERIOD_LABEL = { DAY: 'ngày', MONTH: 'tháng', TOTAL: 'tổng' } as const
export const SCOPE_LABEL = { AGENT: 'Agent', DEPARTMENT: 'Phòng ban', PROJECT: 'Dự án', COMPANY: 'Công ty' } as const
/** Xanh -> vàng ở ngưỡng mềm -> đỏ ở ngưỡng cứng; luôn kèm nhãn chữ (không chỉ dựa vào màu). */
export const STATE_STYLE = { OK: { color: '#15803d', label: 'Bình thường' }, SOFT: { color: '#b45309', label: 'Gần hết' }, HARD: { color: '#b91c1c', label: 'Hết ngân sách' } } as const
