// Màu chữ đọc rõ nhất trên màu áo bất kỳ: chọn giữa chữ trắng và chữ tối, cái nào tương phản cao hơn (màu trung tính có thể không đạt AA với cả hai; chữ cái đầu chỉ để trang trí, đã aria-hidden).
const inkOn = (hex: string) => {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex)
  if (!m) return '#ffffff'
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => { const v = parseInt(h, 16) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return (L + 0.05) / 0.059 > 1.05 / (L + 0.05) ? '#0f172a' : '#ffffff' // 0,059 = độ chói + 0,05 của #0f172a
}

// Vòng tròn màu áo + chữ cái đầu của tên.
export function Avatar({ name, color, size = 32 }: { name: string; color: string; size?: number }) {
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full font-semibold"
      style={{ background: color, color: inkOn(color), width: size, height: size, fontSize: size * 0.45 }}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}
