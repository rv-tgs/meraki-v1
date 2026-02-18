import { useCallback, useEffect, useMemo, useState } from 'react';
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
  NetworkDevice,
  OperationResult,
  Organization,
  SsidPayload,
  SwitchPort,
  SwitchPortProfilePayload,
  SwitchPortView,
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

function isSwitchDevice(device: NetworkDevice): boolean {
  if (device.productType === 'switch') return true;
  return device.model?.startsWith('MS') ?? false;
}

function toSwitchPortView(device: NetworkDevice, ports: SwitchPort[]): SwitchPortView[] {
  return ports.map((port) => ({
    serial: device.serial,
    deviceName: device.name || device.model || device.serial,
    portId: port.portId,
    name: port.name,
    enabled: port.enabled,
    type: port.type,
    vlan: port.vlan,
    allowedVlans: port.allowedVlans
  }));
}

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [org, setOrg] = useState<Organization>();
  const [networks, setNetworks] = useState<Network[]>([]);
  const [selectedNetworkId, setSelectedNetworkId] = useState('');
  const [createdVlans, setCreatedVlans] = useState<CreatedVlan[]>([]);
  const [switchPorts, setSwitchPorts] = useState<SwitchPortView[]>([]);
  const [switchPortsLoading, setSwitchPortsLoading] = useState(false);
  const [switchPortsError, setSwitchPortsError] = useState<string>();
  const [switchPortsLastUpdated, setSwitchPortsLastUpdated] = useState<string>();
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
    setSwitchPorts([]);
    setSwitchPortsError(undefined);
    setSwitchPortsLastUpdated(undefined);
    setSwitchPortsLoading(false);
    setGlobalError(undefined);
    setConnecting(false);
    setLoadingNetworks(false);
  };

  const refreshSwitchPorts = useCallback(
    async (networkIdOverride?: string) => {
      const networkId = networkIdOverride ?? selectedNetworkId;
      if (!networkId || (!isDemoMode && !endpoints)) {
        return;
      }

      setSwitchPortsLoading(true);
      setSwitchPortsError(undefined);

      try {
        if (isDemoMode) {
          const demoPorts: SwitchPortView[] = [
            {
              serial: 'Q2XX-DEMO-0001',
              deviceName: 'Demo Switch HQ',
              portId: '1',
              name: 'Uplink',
              enabled: true,
              type: 'trunk',
              vlan: 1,
              allowedVlans: 'all'
            },
            {
              serial: 'Q2XX-DEMO-0001',
              deviceName: 'Demo Switch HQ',
              portId: '2',
              name: 'Workstation-1',
              enabled: true,
              type: 'access',
              vlan: 10,
              allowedVlans: '10'
            },
            {
              serial: 'Q2XX-DEMO-0002',
              deviceName: 'Demo Switch Branch',
              portId: '3',
              name: 'Printer',
              enabled: true,
              type: 'access',
              vlan: 20,
              allowedVlans: '20'
            }
          ];
          setSwitchPorts(demoPorts);
          setSwitchPortsLastUpdated(new Date().toISOString());
          return;
        }

        const devices = await endpoints!.getNetworkDevices(networkId);
        const switchDevices = devices.filter(isSwitchDevice);

        const settled = await Promise.allSettled(
          switchDevices.map(async (device) => {
            const ports = await endpoints!.getDeviceSwitchPorts(device.serial);
            return toSwitchPortView(device, ports);
          })
        );

        const flattened = settled
          .filter((item): item is PromiseFulfilledResult<SwitchPortView[]> => item.status === 'fulfilled')
          .flatMap((item) => item.value);

        setSwitchPorts(flattened);
        setSwitchPortsLastUpdated(new Date().toISOString());

        const failures = settled.filter((item) => item.status === 'rejected').length;
        if (failures > 0) {
          setSwitchPortsError(`Loaded switch ports with ${failures} device fetch failure(s).`);
        }
      } catch (error) {
        const apiError = error as MerakiApiError;
        setSwitchPorts([]);
        setSwitchPortsError(apiError.message || 'Failed to load switch ports.');
      } finally {
        setSwitchPortsLoading(false);
      }
    },
    [selectedNetworkId, isDemoMode, endpoints]
  );

  useEffect(() => {
    if (!selectedNetworkId || !apiKey) {
      return;
    }
    void refreshSwitchPorts(selectedNetworkId);
  }, [selectedNetworkId, apiKey, refreshSwitchPorts]);

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
      setCreatedVlans([]);
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
            {switchPortsLastUpdated ? (
              <p className="hint">Switch ports last refreshed: {new Date(switchPortsLastUpdated).toLocaleString()}</p>
            ) : null}
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
              <VlanCreateForm
                networkId={selectedNetworkId}
                submitOne={submitVlan}
                onAfterBatchDeploy={() => refreshSwitchPorts(selectedNetworkId)}
              />
              <SwitchPortProfilesFromVlansForm
                networkId={selectedNetworkId}
                vlans={createdVlans}
                switchPorts={switchPorts}
                loadingSwitchPorts={switchPortsLoading}
                switchPortsError={switchPortsError}
                onRefreshSwitchPorts={() => refreshSwitchPorts(selectedNetworkId)}
                submitOne={submitSwitchProfile}
              />
            </div>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
