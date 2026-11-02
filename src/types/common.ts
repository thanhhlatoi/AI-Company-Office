import { z } from 'zod'

// BE (Spring) có thể trả id số hoặc chuỗi: luôn chuẩn hoá về string.
export const Id = z.union([z.string(), z.number()]).transform(String)
/** Tiền: số nguyên micro-USD (1 USD = 1_000_000). Hiển thị qua lib/money.ts. */
export const Micro = z.number().int()
/** Trang dữ liệu cuộn vô hạn theo cursor: `nextCursor` null/thiếu = hết. */
export const pageOf = <T extends z.ZodType>(item: T) => z.object({ items: z.array(item), nextCursor: z.string().nullish() })
/** DomainEvent id: tăng dần, liên tục. Message cũ chưa có id vẫn được xử lý ngay (không tham gia bù sự kiện). */
export const EventId = z.number().int().positive().optional()
