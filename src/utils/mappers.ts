import type { SwitchPortProfilePayload } from '../types/meraki';

export function vlanToSwitchProfile(
  vlanId: string,
  vlanName: string,
  namePrefix: string,
  allowedVlans = 'all'
): SwitchPortProfilePayload {
  return {
    name: `${namePrefix} ${vlanName}`.trim(),
    tags: [`vlan-${vlanId}`],
    enabled: true,
    port: {
      type: 'access',
      vlan: Number(vlanId),
      allowedVlans,
      poeEnabled: true
    }
  };
}
