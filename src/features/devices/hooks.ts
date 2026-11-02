import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { getNetworkTopology, listDeviceEvents, listDevices } from '../../api/devices'
import { useDeviceStore } from '../../store/deviceStore'
import { checkHeartbeats, evaluateDevice } from './alerts'

/** Tải GET /devices và /network/topology vào store, rồi canh heartbeat. Gọi 1 lần ở gốc app. */
export function useDevicesSync() {
  const devices = useQuery({ queryKey: ['devices'], queryFn: listDevices })
  const links = useQuery({ queryKey: ['network'], queryFn: getNetworkTopology })
  useEffect(() => {
    if (!devices.data) return
    useDeviceStore.getState().setDevices(devices.data)
    devices.data.forEach((d) => evaluateDevice(d.id))
  }, [devices.data])
  useEffect(() => { if (links.data) useDeviceStore.getState().setLinks(links.data) }, [links.data])
  useEffect(() => {
    const t = setInterval(() => { checkHeartbeats(); Object.keys(useDeviceStore.getState().devicesById).forEach((id) => evaluateDevice(id)) }, 5000)
    return () => clearInterval(t)
  }, [])
}

/** Lịch sử cũ của thiết bị từ BE (trước khi mở trang). */
export const useDeviceHistory = (id: string) => useQuery({ queryKey: ['device-events', id], queryFn: () => listDeviceEvents(id) })
