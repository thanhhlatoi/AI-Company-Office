/** Thông số di chuyển (px, ms). Bước 5 sẽ cho chỉnh tốc độ trong Cài đặt. */
export const MOVE = {
  walkSpeed: 90, // px/giây với quãng ngắn
  maxSpeed: 260, // quãng dài tự tăng tốc, nhưng không quá mức này
  maxTripSeconds: 10, // mục tiêu: mỗi hành trình không quá ~10 giây
  easeDistance: 48, // đoạn đầu/cuối tăng giảm tốc nhẹ
  standUpMs: 300,
  sitDownMs: 300,
  lookAhead: 26, // nhìn trước bao xa để biết có người chắn
  personRadius: 22, // hai người gần hơn mức này coi là va chạm
  touchRadius: 20, // gần hơn mức này là sắp chồng lên nhau
  repathAfterMs: 1000, // bị chắn quá 1s: tìm đường vòng
  giveUpAfterMs: 3000, // kẹt quá 3s: bỏ hành trình, đi tắt về chỗ
  queueGap: 52, // khoảng cách giữa hai người xếp hàng
  fadeMs: 160, // giảm chuyển động: mờ đi / hiện ra
} as const
