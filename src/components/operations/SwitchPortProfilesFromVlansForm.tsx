import { useEffect, useMemo, useState } from 'react';
import type { CreatedVlan, OperationResult, SwitchPortProfilePayload, SwitchPortView } from '../../types/meraki';
import { isRequired, isValidAllowedVlans } from '../../utils/validators';
import ApiResult from '../common/ApiResult';

interface SwitchPortProfilesFromVlansFormProps {
  networkId: string;
  vlans: CreatedVlan[];
  switchPorts: SwitchPortView[];
  loadingSwitchPorts: boolean;
  switchPortsError?: string;
  onRefreshSwitchPorts: () => Promise<void>;
  submitOne: (payload: SwitchPortProfilePayload) => Promise<OperationResult>;
}

export default function SwitchPortProfilesFromVlansForm({
  networkId,
  vlans,
  switchPorts,
  loadingSwitchPorts,
  switchPortsError,
  onRefreshSwitchPorts,
  submitOne
}: SwitchPortProfilesFromVlansFormProps) {
  const [prefix, setPrefix] = useState('AUTO');
  const [allowedVlans, setAllowedVlans] = useState('all');
  const [selectedVlanId, setSelectedVlanId] = useState('');
  const [selectedPorts, setSelectedPorts] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<OperationResult[]>([]);

  useEffect(() => {
    if (!selectedVlanId && vlans.length > 0) {
      setSelectedVlanId(vlans[0].id);
    }
    if (vlans.length === 0) {
      setSelectedVlanId('');
    }
  }, [selectedVlanId, vlans]);

  const selectedSwitchPorts = useMemo(
    () => switchPorts.filter((port) => selectedPorts[`${port.serial}-${port.portId}`]),
    [switchPorts, selectedPorts]
  );

  const valid =
    isRequired(prefix) &&
    isValidAllowedVlans(allowedVlans) &&
    isRequired(selectedVlanId) &&
    selectedSwitchPorts.length > 0;

  const togglePort = (port: SwitchPortView, enabled: boolean) => {
    const key = `${port.serial}-${port.portId}`;
    setSelectedPorts((current) => ({ ...current, [key]: enabled }));
  };

  const submitProfiles = async () => {
    if (!valid) {
      return;
    }

    setLoading(true);
    const nextResults: OperationResult[] = [];

    for (const port of selectedSwitchPorts) {
      const vlanNum = Number(selectedVlanId);
      const payload: SwitchPortProfilePayload = {
        name: `${prefix}-${port.deviceName}-P${port.portId}`,
        tags: [`device-${port.serial}`, `port-${port.portId}`, `vlan-${selectedVlanId}`],
        enabled: true,
        port: {
          type: 'access',
          vlan: Number.isNaN(vlanNum) ? undefined : vlanNum,
          allowedVlans,
          poeEnabled: true
        }
      };
      const result = await submitOne(payload);
      nextResults.push(result);
    }

    setResults(nextResults);
    setLoading(false);
  };

  return (
    <section className="card">
      <h3>Create Switch Port Profiles from Live Switch Ports</h3>
      <p>Network: {networkId}</p>
      <p className="hint">Switch ports are fetched via GET and refreshed after VLAN deployments.</p>

      <div className="toolbar-row">
        <button type="button" className="secondary" onClick={() => void onRefreshSwitchPorts()} disabled={loadingSwitchPorts}>
          {loadingSwitchPorts ? 'Refreshing...' : 'Refresh Switch Ports'}
        </button>
      </div>

      {switchPortsError ? <p className="error">{switchPortsError}</p> : null}

      {switchPorts.length === 0 ? (
        <p>No switch ports available for this network yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="vlan-table">
            <thead>
              <tr>
                <th>Select</th>
                <th>Device</th>
                <th>Serial</th>
                <th>Port</th>
                <th>Name</th>
                <th>Current Type</th>
                <th>Current VLAN</th>
                <th>Allowed VLANs</th>
              </tr>
            </thead>
            <tbody>
              {switchPorts.map((port) => {
                const key = `${port.serial}-${port.portId}`;
                return (
                  <tr key={key}>
                    <td>
                      <input
                        type="checkbox"
                        checked={!!selectedPorts[key]}
                        onChange={(event) => togglePort(port, event.target.checked)}
                      />
                    </td>
                    <td>{port.deviceName}</td>
                    <td>{port.serial}</td>
                    <td>{port.portId}</td>
                    <td>{port.name || '-'}</td>
                    <td>{port.type || '-'}</td>
                    <td>{port.vlan ?? '-'}</td>
                    <td>{port.allowedVlans || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid">
        <label>
          VLAN Target (from deployed VLANs)
          <select value={selectedVlanId} onChange={(event) => setSelectedVlanId(event.target.value)}>
            <option value="">Choose a VLAN</option>
            {vlans.map((vlan) => (
              <option key={vlan.id} value={vlan.id}>
                {vlan.id} - {vlan.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Profile Name Prefix (required)
          <input value={prefix} onChange={(event) => setPrefix(event.target.value)} />
        </label>
        <label>
          Allowed VLANs (required format: all, IDs, ranges)
          <input value={allowedVlans} onChange={(event) => setAllowedVlans(event.target.value)} />
        </label>
      </div>

      <div className="toolbar-row">
        <button type="button" onClick={submitProfiles} disabled={loading || !valid}>
          {loading ? 'Creating profiles...' : `Create Profiles for ${selectedSwitchPorts.length} selected port(s)`}
        </button>
      </div>

      {results.map((result, index) => (
        <ApiResult key={`${result.timestamp}-${index}`} result={result} />
      ))}
    </section>
  );
}
