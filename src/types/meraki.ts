export interface Organization {
  id: string;
  name: string;
  url?: string;
}

export interface Network {
  id: string;
  organizationId?: string;
  name: string;
  productTypes?: string[];
  timeZone?: string;
  tags?: string[];
}

export interface NetworkDevice {
  serial: string;
  name?: string;
  model?: string;
  productType?: string;
}

export interface SwitchPort {
  portId: string;
  name?: string;
  enabled?: boolean;
  type?: 'access' | 'trunk';
  vlan?: number;
  allowedVlans?: string;
}

export interface SwitchPortView {
  serial: string;
  deviceName: string;
  portId: string;
  name?: string;
  enabled?: boolean;
  type?: 'access' | 'trunk';
  vlan?: number;
  allowedVlans?: string;
}

export interface NetworkSwitchPortProfile {
  profileId?: string;
  id?: string;
  name?: string;
  description?: string;
  [key: string]: unknown;
}

export interface MerakiApiError {
  status?: number;
  message: string;
  details?: unknown;
  requestId?: string;
}

export interface SsidPayload {
  name: string;
  enabled: boolean;
  authMode?: 'open' | 'psk' | 'open-with-radius' | '8021x-radius';
  psk?: string;
  ipAssignmentMode?: 'NAT mode' | 'Bridge mode' | 'Layer 3 roaming' | 'VPN';
}

export interface VlanSettingsPayload {
  vlansEnabled: boolean;
}

export interface GroupPolicyPayload {
  name: string;
  firewallAndTrafficShaping?: {
    settings?: string;
    trafficShapingRules?: unknown[];
    l3FirewallRules?: unknown[];
    l7FirewallRules?: unknown[];
  };
  [key: string]: unknown;
}

export interface CreateVlanPayload {
  id: string;
  name: string;
  subnet: string;
  applianceIp: string;
  groupPolicyId?: string;
}

export interface SwitchPortProfilePayload {
  name: string;
  tags?: string[];
  enabled?: boolean;
  port?: {
    type?: 'access' | 'trunk';
    vlan?: number;
    voiceVlan?: number;
    allowedVlans?: string;
    poeEnabled?: boolean;
  };
}

export interface CreatedVlan {
  id: string;
  name: string;
  subnet?: string;
}

export interface OperationResult {
  operation: string;
  success: boolean;
  timestamp: string;
  payload: unknown;
  response?: unknown;
  error?: MerakiApiError;
}
