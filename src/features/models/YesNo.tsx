/** Có / Không / — (không báo). Không báo khác với Không nên có màu và chữ riêng. */
export function YesNo({ v }: { v: boolean | null | undefined }) {
  if (v == null) return <span className="text-slate-400" aria-label="Không rõ">—</span>
  return v ? <span className="font-medium text-green-800">Có</span> : <span className="text-slate-500">Không</span>
}
