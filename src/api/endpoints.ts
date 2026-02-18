import type {
  CreateVlanPayload,
  GroupPolicyPayload,
  Network,
  NetworkDevice,
  Organization,
  SsidPayload,
  SwitchPort,
  SwitchPortProfilePayload,
  VlanSettingsPayload
} from '../types/meraki';
import { MerakiClient } from './merakiClient';

export function buildEndpoints(apiKey: string) {
  const client = new MerakiClient(apiKey);

  return {
    getOrganizations: (signal?: AbortSignal) =>
      client.request<Organization[]>('/organizations', { signal }),

    getOrganizationNetworks: (organizationId: string, signal?: AbortSignal) =>
      client.request<Network[]>(`/organizations/${organizationId}/networks`, { signal }),

    getNetworkDevices: (networkId: string, signal?: AbortSignal) =>
      client.request<NetworkDevice[]>(`/networks/${networkId}/devices`, { signal }),

    getDeviceSwitchPorts: (serial: string, signal?: AbortSignal) =>
      client.request<SwitchPort[]>(`/devices/${serial}/switch/ports`, { signal }),

    upsertWirelessSsid: (networkId: string, number: number, payload: SsidPayload) =>
      client.request(`/networks/${networkId}/wireless/ssids/${number}`, {
        method: 'PUT',
        body: payload
      }),

    updateApplianceVlanSettings: (networkId: string, payload: VlanSettingsPayload) =>
      client.request(`/networks/${networkId}/appliance/vlans/settings`, {
        method: 'PUT',
        body: payload
      }),

    createGroupPolicy: (networkId: string, payload: GroupPolicyPayload) =>
      client.request(`/networks/${networkId}/groupPolicies`, {
        method: 'POST',
        body: payload
      }),

    createVlan: (networkId: string, payload: CreateVlanPayload) =>
      client.request(`/networks/${networkId}/appliance/vlans`, {
        method: 'POST',
        body: payload
      }),

    createSwitchPortProfile: (networkId: string, payload: SwitchPortProfilePayload) =>
      client.request(`/networks/${networkId}/switch/ports/profiles`, {
        method: 'POST',
        body: payload
      })
  };
}
