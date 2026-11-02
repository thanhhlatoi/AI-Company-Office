/** CSV an toàn: bọc dấu ngoặc kép khi cần, nhân đôi dấu ngoặc kép, và chặn "công thức" (=, +, -, @) để mở bằng Excel không bị chạy. */
export function toCsv(rows: (string | number)[][]): string {
  const cell = (v: string | number) => {
    let s = String(v)
    if (typeof v === 'string' && /^[=+\-@]/.test(s)) s = `'${s}` // chống CSV injection
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return rows.map((r) => r.map(cell).join(',')).join('\r\n')
}
