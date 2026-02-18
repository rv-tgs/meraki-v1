import { useMemo, useState } from 'react';
import { buildEndpoints } from './api/endpoints';
import AuthGate from './components/AuthGate';
import NetworkSelector from './components/NetworkSelector';
import GroupPolicyForm from './components/operations/GroupPolicyForm';
import SsidForm from './components/operations/SsidForm';
import SwitchPortProfilesFromVlansForm from './components/operations/SwitchPortProfilesFromVlansForm';
import VlanCreateForm from './components/operations/VlanCreateForm';
import VlanSettingsForm from './components/operations/VlanSettingsForm';
import type {
  CreateVlanPayload,
  CreatedVlan,
  GroupPolicyPayload,
  MerakiApiError,
  Network,
  OperationResult,
  Organization,
  SsidPayload,
  SwitchPortProfilePayload,
  VlanSettingsPayload
} from './types/meraki';

function buildResult(
  operation: string,
  payload: unknown,
  response?: unknown,
  error?: MerakiApiError
): OperationResult {
  return {
    operation,
    payload,
    response,
    success: !error,
    error,
    timestamp: new Date().toISOString()
  };
}

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [org, setOrg] = useState<Organization>();
  const [networks, setNetworks] = useState<Network[]>([]);
  const [selectedNetworkId, setSelectedNetworkId] = useState('');
  const [createdVlans, setCreatedVlans] = useState<CreatedVlan[]>([]);
  const [globalError, setGlobalError] = useState<string>();
  const [connecting, setConnecting] = useState(false);
  const [loadingNetworks, setLoadingNetworks] = useState(false);

  const endpoints = useMemo(() => {
    if (!apiKey) return undefined;
    return buildEndpoints(apiKey);
  }, [apiKey]);

  const clearSession = () => {
    setApiKey('');
    setIsDemoMode(false);
    setOrg(undefined);
    setNetworks([]);
    setSelectedNetworkId('');
    setCreatedVlans([]);
    setGlobalError(undefined);
    setConnecting(false);
    setLoadingNetworks(false);
  };

  const connect = async (key: string) => {
    setConnecting(true);
    setGlobalError(undefined);

    try {
      const localEndpoints = buildEndpoints(key);
      const organizations = await localEndpoints.getOrganizations();

      if (!organizations.length) {
        setGlobalError('No organizations found for this API key.');
        setConnecting(false);
        return;
      }

      const firstOrg = organizations[0];
      setOrg(firstOrg);
      setApiKey(key);
      setIsDemoMode(false);
      setLoadingNetworks(true);

      const orgNetworks = await localEndpoints.getOrganizationNetworks(firstOrg.id);
      setNetworks(orgNetworks);
      setSelectedNetworkId(orgNetworks[0]?.id ?? '');
    } catch (error) {
      const apiError = error as MerakiApiError;
      setGlobalError(apiError.message ?? 'Unable to connect to Meraki API.');
    } finally {
      setConnecting(false);
      setLoadingNetworks(false);
    }
  };

  const runDemoMode = () => {
    setGlobalError(undefined);
    setConnecting(false);
    setLoadingNetworks(false);
    setApiKey('DEMO_MODE');
    setIsDemoMode(true);
    const demoOrg: Organization = { id: 'demo-org-1', name: 'Demo Organization' };
    const demoNetworks: Network[] = [
      { id: 'demo-network-1', name: 'HQ Demo Network', productTypes: ['appliance', 'wireless', 'switch'] },
      { id: 'demo-network-2', name: 'Branch Demo Network', productTypes: ['appliance', 'wireless'] }
    ];
    setOrg(demoOrg);
    setNetworks(demoNetworks);
    setSelectedNetworkId(demoNetworks[0].id);
    setCreatedVlans([]);
  };

  const runOperation = async <T,>(
    operation: string,
    payload: unknown,
    executor: () => Promise<T>
  ): Promise<OperationResult> => {
    if (isDemoMode) {
      return buildResult(operation, payload, {
        demo: true,
        message: 'Demo mode enabled. No live Meraki API request was sent.'
      });
    }
    return callOperation(operation, payload, executor);
  };

  const callOperation = async <T,>(
    operation: string,
    payload: unknown,
    executor: () => Promise<T>
  ): Promise<OperationResult> => {
    try {
      const response = await executor();
      return buildResult(operation, payload, response);
    } catch (error) {
      return buildResult(operation, payload, undefined, error as MerakiApiError);
    }
  };

  const submitSsid = async (number: number, payload: SsidPayload) => {
    if ((!endpoints && !isDemoMode) || !selectedNetworkId) {
      return buildResult('SSID Update', payload, undefined, { message: 'Missing connection or network selection.' });
    }
    return runOperation('SSID Update', { number, ...payload }, () =>
      endpoints!.upsertWirelessSsid(selectedNetworkId, number, payload)
    );
  };

  const submitVlanSettings = async (payload: VlanSettingsPayload) => {
    if ((!endpoints && !isDemoMode) || !selectedNetworkId) {
      return buildResult('VLAN Settings Update', payload, undefined, {
        message: 'Missing connection or network selection.'
      });
    }
    return runOperation('VLAN Settings Update', payload, () =>
      endpoints!.updateApplianceVlanSettings(selectedNetworkId, payload)
    );
  };

  const submitGroupPolicy = async (payload: GroupPolicyPayload) => {
    if ((!endpoints && !isDemoMode) || !selectedNetworkId) {
      return buildResult('Group Policy Create', payload, undefined, {
        message: 'Missing connection or network selection.'
      });
    }
    return runOperation('Group Policy Create', payload, () =>
      endpoints!.createGroupPolicy(selectedNetworkId, payload)
    );
  };

  const submitVlan = async (payload: CreateVlanPayload) => {
    if ((!endpoints && !isDemoMode) || !selectedNetworkId) {
      return buildResult('VLAN Create', payload, undefined, {
        message: 'Missing connection or network selection.'
      });
    }

    const result = await runOperation('VLAN Create', payload, () =>
      endpoints!.createVlan(selectedNetworkId, payload)
    );

    if (result.success) {
      setCreatedVlans((current) => {
        const exists = current.some((item) => item.id === payload.id);
        if (exists) {
          return current;
        }
        return [...current, { id: payload.id, name: payload.name, subnet: payload.subnet }];
      });
    }

    return result;
  };

  const submitSwitchProfile = async (payload: SwitchPortProfilePayload) => {
    if ((!endpoints && !isDemoMode) || !selectedNetworkId) {
      return buildResult('Switch Port Profile Create', payload, undefined, {
        message: 'Missing connection or network selection.'
      });
    }
    return runOperation('Switch Port Profile Create', payload, () =>
      endpoints!.createSwitchPortProfile(selectedNetworkId, payload)
    );
  };

  return (
    <main className="container">
      <header>
        <div className="header-row">
          <h1>Meraki Rapid Configurator</h1>
          {apiKey ? (
            <button type="button" className="secondary" onClick={clearSession}>
              Disconnect / Clear Session
            </button>
          ) : null}
        </div>
        <p>Automate common Cisco Meraki API configuration tasks.</p>
        {isDemoMode ? <p className="hint">Running in demo mode. API requests are simulated.</p> : null}
      </header>

      {!apiKey ? (
        <AuthGate loading={connecting} error={globalError} onConnect={connect} onRunDemo={runDemoMode} />
      ) : null}

      {apiKey ? (
        <>
          <section className="card muted">
            <p>
              Auto-selected organization: <strong>{org?.name}</strong> ({org?.id})
            </p>
          </section>

          <NetworkSelector
            loading={loadingNetworks}
            networks={networks}
            selectedNetworkId={selectedNetworkId}
            onSelect={(networkId) => {
              setSelectedNetworkId(networkId);
              setCreatedVlans([]);
            }}
          />

          {selectedNetworkId ? (
            <div className="ops-grid">
              <SsidForm networkId={selectedNetworkId} submit={submitSsid} />
              <VlanSettingsForm networkId={selectedNetworkId} submit={submitVlanSettings} />
              <GroupPolicyForm networkId={selectedNetworkId} submit={submitGroupPolicy} />
              <VlanCreateForm networkId={selectedNetworkId} submit={submitVlan} />
              <SwitchPortProfilesFromVlansForm
                networkId={selectedNetworkId}
                vlans={createdVlans}
                submitOne={submitSwitchProfile}
              />
            </div>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
