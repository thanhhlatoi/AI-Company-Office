export function SkillChips({ skills }: { skills: string[] }) {
  if (!skills.length) return <span className="text-slate-600">Chưa khai báo</span>
  return <ul className="flex flex-wrap gap-1">{skills.map((s) => <li key={s} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{s}</li>)}</ul>
}
