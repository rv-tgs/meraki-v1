import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildEndpoints } from './api/endpoints';
import AuthGate from './components/AuthGate';
import NetworkSelector from './components/NetworkSelector';
import GroupPolicyForm from './components/operations/GroupPolicyForm';
import SsidForm from './components/operations/SsidForm';
import SwitchPortProfilesFromVlansForm from './components/operations/SwitchPortProfilesFromVlansForm';
import VlanCreateForm from './components/operations/VlanCreateForm';
import type {
  CreateVlanPayload,
  CreatedVlan,
  GroupPolicyPayload,
  MerakiApiError,
  Network,
  NetworkSwitchPortProfile,
  OperationResult,
  Organization,
  SsidPayload,
  SwitchPortProfilePayload,
  VlanSettingsPayload
} from './types/meraki';

interface ApiLogEntry {
  timestamp: string;
  operation: string;
  method: 'GET' | 'POST' | 'PUT';
  endpoint: string;
  requestBody?: unknown;
  response?: unknown;
  error?: MerakiApiError;
}

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
  const [autoProfileCreateResults, setAutoProfileCreateResults] = useState<OperationResult[]>([]);
  const [networkSwitchProfiles, setNetworkSwitchProfiles] = useState<NetworkSwitchPortProfile[]>([]);
  const [switchProfilesLoading, setSwitchProfilesLoading] = useState(false);
  const [switchProfilesError, setSwitchProfilesError] = useState<string>();
  const [switchProfilesLastUpdated, setSwitchProfilesLastUpdated] = useState<string>();
  const [globalError, setGlobalError] = useState<string>();
  const [connecting, setConnecting] = useState(false);
  const [loadingNetworks, setLoadingNetworks] = useState(false);
  const [apiLogs, setApiLogs] = useState<ApiLogEntry[]>([]);

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
    setAutoProfileCreateResults([]);
    setNetworkSwitchProfiles([]);
    setSwitchProfilesLoading(false);
    setSwitchProfilesError(undefined);
    setSwitchProfilesLastUpdated(undefined);
    setGlobalError(undefined);
    setConnecting(false);
    setLoadingNetworks(false);
    setApiLogs([]);
  };

  const addApiLog = (entry: ApiLogEntry) => {
    setApiLogs((current) => [entry, ...current]);
  };

  const formatApiLogs = (logs: ApiLogEntry[]): string => {
    if (logs.length === 0) {
      return 'No API calls logged yet.';
    }
    return logs
      .map((log) =>
        JSON.stringify(
          {
            timestamp: log.timestamp,
            operation: log.operation,
            request: {
              method: log.method,
              endpoint: log.endpoint,
              body: log.requestBody
            },
            response: log.response,
            error: log.error
          },
          null,
          2
        )
      )
      .join('\n\n');
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
    request: { method: 'GET' | 'POST' | 'PUT'; endpoint: string },
    executor: () => Promise<T>
  ): Promise<OperationResult> => {
    const timestamp = new Date().toISOString();
    if (isDemoMode) {
      const response = {
        demo: true,
        message: 'Demo mode enabled. No live Meraki API request was sent.'
      };
      addApiLog({
        timestamp,
        operation,
        method: request.method,
        endpoint: request.endpoint,
        requestBody: payload,
        response
      });
      return buildResult(operation, payload, response);
    }

    const result = await callOperation(operation, payload, executor);
    addApiLog({
      timestamp,
      operation,
      method: request.method,
      endpoint: request.endpoint,
      requestBody: payload,
      response: result.response,
      error: result.error
    });
    return result;
  };

  const refreshSwitchProfiles = useCallback(
    async (networkIdOverride?: string) => {
      const networkId = networkIdOverride ?? selectedNetworkId;
      if (!networkId || (!isDemoMode && !endpoints)) {
        return;
      }

      setSwitchProfilesLoading(true);
      setSwitchProfilesError(undefined);

      try {
        if (isDemoMode) {
          const demoProfiles: NetworkSwitchPortProfile[] = [
            { id: 'demo-profile-1', name: 'VLAN10-Users', description: 'Auto profile demo' },
            { id: 'demo-profile-2', name: 'VLAN20-Guest', description: 'Auto profile demo' }
          ];
          setNetworkSwitchProfiles(demoProfiles);
          setSwitchProfilesLastUpdated(new Date().toISOString());
          addApiLog({
            timestamp: new Date().toISOString(),
            operation: 'Get Switch Port Profiles',
            method: 'GET',
            endpoint: `/networks/${networkId}/switch/ports/profiles`,
            response: demoProfiles
          });
          return;
        }

        const profiles = await endpoints!.getNetworkSwitchPortProfiles(networkId);
        setNetworkSwitchProfiles(profiles);
        setSwitchProfilesLastUpdated(new Date().toISOString());
        addApiLog({
          timestamp: new Date().toISOString(),
          operation: 'Get Switch Port Profiles',
          method: 'GET',
          endpoint: `/networks/${networkId}/switch/ports/profiles`,
          response: profiles
        });
      } catch (error) {
        const apiError = error as MerakiApiError;
        setNetworkSwitchProfiles([]);
        setSwitchProfilesError(apiError.message || 'Failed to load switch port profiles.');
        addApiLog({
          timestamp: new Date().toISOString(),
          operation: 'Get Switch Port Profiles',
          method: 'GET',
          endpoint: `/networks/${networkId}/switch/ports/profiles`,
          error: apiError
        });
      } finally {
        setSwitchProfilesLoading(false);
      }
    },
    [selectedNetworkId, isDemoMode, endpoints]
  );

  useEffect(() => {
    if (!selectedNetworkId || !apiKey) {
      return;
    }
    void refreshSwitchProfiles(selectedNetworkId);
  }, [selectedNetworkId, apiKey, refreshSwitchProfiles]);

  const connect = async (key: string) => {
    setConnecting(true);
    setGlobalError(undefined);

    try {
      const localEndpoints = buildEndpoints(key);
      const organizations = await localEndpoints.getOrganizations();
      addApiLog({
        timestamp: new Date().toISOString(),
        operation: 'Get Organizations',
        method: 'GET',
        endpoint: '/organizations',
        response: organizations
      });

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
      addApiLog({
        timestamp: new Date().toISOString(),
        operation: 'Get Organization Networks',
        method: 'GET',
        endpoint: `/organizations/${firstOrg.id}/networks`,
        response: orgNetworks
      });
      setNetworks(orgNetworks);
      setSelectedNetworkId(orgNetworks[0]?.id ?? '');
      setCreatedVlans([]);
      setAutoProfileCreateResults([]);
      setNetworkSwitchProfiles([]);
      setSwitchProfilesError(undefined);
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
    setAutoProfileCreateResults([]);
    setNetworkSwitchProfiles([]);
    setSwitchProfilesError(undefined);
  };

  const submitSsid = async (number: number, payload: SsidPayload) => {
    if ((!endpoints && !isDemoMode) || !selectedNetworkId) {
      return buildResult('SSID Update', payload, undefined, { message: 'Missing connection or network selection.' });
    }
    return runOperation(
      'SSID Update',
      { number, ...payload },
      { method: 'PUT', endpoint: `/networks/${selectedNetworkId}/wireless/ssids/${number}` },
      () =>
      endpoints!.upsertWirelessSsid(selectedNetworkId, number, payload)
    );
  };

  const submitVlanSettings = async (payload: VlanSettingsPayload) => {
    if ((!endpoints && !isDemoMode) || !selectedNetworkId) {
      return buildResult('VLAN Settings Update', payload, undefined, {
        message: 'Missing connection or network selection.'
      });
    }
    return runOperation(
      'VLAN Settings Update',
      payload,
      { method: 'PUT', endpoint: `/networks/${selectedNetworkId}/appliance/vlans/settings` },
      () =>
      endpoints!.updateApplianceVlanSettings(selectedNetworkId, payload)
    );
  };

  const submitGroupPolicy = async (payload: GroupPolicyPayload) => {
    if ((!endpoints && !isDemoMode) || !selectedNetworkId) {
      return buildResult('Group Policy Create', payload, undefined, {
        message: 'Missing connection or network selection.'
      });
    }
    return runOperation(
      'Group Policy Create',
      payload,
      { method: 'POST', endpoint: `/networks/${selectedNetworkId}/groupPolicies` },
      () =>
      endpoints!.createGroupPolicy(selectedNetworkId, payload)
    );
  };

  const submitVlan = async (payload: CreateVlanPayload) => {
    if ((!endpoints && !isDemoMode) || !selectedNetworkId) {
      return buildResult('VLAN Create', payload, undefined, {
        message: 'Missing connection or network selection.'
      });
    }

    const vlanResult = await runOperation(
      'VLAN Create',
      payload,
      { method: 'POST', endpoint: `/networks/${selectedNetworkId}/appliance/vlans` },
      () =>
      endpoints!.createVlan(selectedNetworkId, payload)
    );

    if (vlanResult.success) {
      setCreatedVlans((current) => {
        const exists = current.some((item) => item.id === payload.id);
        if (exists) {
          return current;
        }
        return [...current, { id: payload.id, name: payload.name, subnet: payload.subnet }];
      });

      const profilePayload: SwitchPortProfilePayload = {
        name: `VLAN${payload.id}-${payload.name}`,
        tags: [`vlan-${payload.id}`, `subnet-${payload.subnet}`],
        enabled: true,
        port: {
          type: 'access',
          vlan: Number(payload.id),
          allowedVlans: payload.id,
          poeEnabled: true
        }
      };

      const profileResult = await runOperation(
        'Auto Switch Port Profile Create',
        profilePayload,
        { method: 'POST', endpoint: `/networks/${selectedNetworkId}/switch/ports/profiles` },
        () =>
        endpoints!.createSwitchPortProfile(selectedNetworkId, profilePayload)
      );
      setAutoProfileCreateResults((current) => [profileResult, ...current]);
    }

    return vlanResult;
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
            {switchProfilesLastUpdated ? (
              <p className="hint">
                Switch port profiles last refreshed: {new Date(switchProfilesLastUpdated).toLocaleString()}
              </p>
            ) : null}
          </section>

          <NetworkSelector
            loading={loadingNetworks}
            networks={networks}
            selectedNetworkId={selectedNetworkId}
            onSelect={(networkId) => {
              setSelectedNetworkId(networkId);
              setCreatedVlans([]);
              setAutoProfileCreateResults([]);
              setNetworkSwitchProfiles([]);
              setSwitchProfilesError(undefined);
            }}
          />

          {selectedNetworkId ? (
            <div className="ops-stack">
              <div className="ops-two-col">
                <SsidForm submit={submitSsid} />
                <GroupPolicyForm submit={submitGroupPolicy} />
              </div>
              <VlanCreateForm
                applyVlanSettings={submitVlanSettings}
                submitOne={submitVlan}
                onAfterBatchDeploy={() => refreshSwitchProfiles(selectedNetworkId)}
              />
              <SwitchPortProfilesFromVlansForm
                autoProfileResults={autoProfileCreateResults}
                networkProfiles={networkSwitchProfiles}
                loadingProfiles={switchProfilesLoading}
                profilesError={switchProfilesError}
                onRefreshProfiles={() => refreshSwitchProfiles(selectedNetworkId)}
              />
            </div>
          ) : null}

          <section className="card">
            <h3>Raw API Log</h3>
            <p className="hint">Raw request/response history for all API calls from this session.</p>
            <textarea className="json-box raw-log" readOnly value={formatApiLogs(apiLogs)} />
          </section>
        </>
      ) : null}
    </main>
  );
}
