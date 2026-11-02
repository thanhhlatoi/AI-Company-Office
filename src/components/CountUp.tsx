import { useEffect, useRef, useState } from 'react'
import { motionQuery } from '../lib/motion'

/** Số đổi giá trị thì đếm dần tới giá trị mới (~400ms). Bật "giảm chuyển động" thì đổi ngay. */
export function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    if (motionQuery().matches || from.current === value) { from.current = value; setShown(value); return }
    const start = performance.now()
    const a = from.current
    let raf = 0
    const step = (now: number) => {
      const t = Math.max(0, Math.min(1, (now - start) / 400)) // rAF có thể báo mốc sớm hơn lúc bắt đầu
      const v = a + (value - a) * (1 - (1 - t) ** 3)
      from.current = v
      setShown(v)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{shown.toFixed(decimals)}</>
}
