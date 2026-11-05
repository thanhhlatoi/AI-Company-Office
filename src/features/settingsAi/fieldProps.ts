export const INPUT = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none disabled:bg-slate-100 disabled:text-slate-600'

/** Gắn nhãn + gợi ý + lỗi vào ô nhập qua id (label for, aria-describedby, aria-invalid). */
export const fieldProps = (id: string, error?: string) => ({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': `${id}-hint ${id}-err` })
