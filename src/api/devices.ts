import { z } from 'zod'
import { DeviceEventSchema, DeviceSchema, NetworkLinkSchema } from '../types'
import { request } from './http'

export const listDevices = () => request('GET', '/devices', z.array(DeviceSchema))
export const listDeviceEvents = (id: string) => request('GET', `/devices/${id}/events`, z.array(DeviceEventSchema))
export const getNetworkTopology = () => request('GET', '/network/topology', z.array(NetworkLinkSchema))
