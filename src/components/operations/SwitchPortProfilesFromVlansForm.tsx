import { FormEvent, useState } from 'react';
import type { CreatedVlan, OperationResult } from '../../types/meraki';
import { vlanToSwitchProfile } from '../../utils/mappers';
import { isRequired, isValidAllowedVlans } from '../../utils/validators';
import ApiResult from '../common/ApiResult';

interface SwitchPortProfilesFromVlansFormProps {
  networkId: string;
  vlans: CreatedVlan[];
  submitOne: (payload: { name: string; tags: string[]; enabled: boolean; port: { type: 'access'; vlan: number; allowedVlans: string; poeEnabled: boolean } }) => Promise<OperationResult>;
}

export default function SwitchPortProfilesFromVlansForm({
  networkId,
  vlans,
  submitOne
}: SwitchPortProfilesFromVlansFormProps) {
  const [prefix, setPrefix] = useState('AUTO');
  const [allowedVlans, setAllowedVlans] = useState('all');
  const [strictMode, setStrictMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<OperationResult[]>([]);

  const strictValid = !strictMode || (isRequired(prefix) && isValidAllowedVlans(allowedVlans));
  const valid = vlans.length > 0 && strictValid;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    setLoading(true);

    const nextResults: OperationResult[] = [];
    for (const vlan of vlans) {
      const payload = vlanToSwitchProfile(vlan.id, vlan.name, prefix, allowedVlans);
      const result = await submitOne({
        name: payload.name,
        tags: payload.tags ?? [],
        enabled: payload.enabled ?? true,
        port: {
          type: 'access',
          vlan: payload.port?.vlan ?? Number(vlan.id),
          allowedVlans: payload.port?.allowedVlans ?? 'all',
          poeEnabled: payload.port?.poeEnabled ?? true
        }
      });
      nextResults.push(result);
    }

    setResults(nextResults);
    setLoading(false);
  };

  return (
    <section className="card">
      <h3>Create Switch Port Profiles from Created VLANs</h3>
      <p>Network: {networkId}</p>
      {vlans.length === 0 ? (
        <p>Create at least one VLAN first to auto-generate port profiles.</p>
      ) : (
        <>
          <p>Queued VLANs: {vlans.map((vlan) => `${vlan.id}-${vlan.name}`).join(', ')}</p>
          <form className="grid" onSubmit={onSubmit}>
            <label>
              Profile Name Prefix
              <input value={prefix} onChange={(e) => setPrefix(e.target.value)} />
            </label>
            <label>
              Allowed VLANs
              <input value={allowedVlans} onChange={(e) => setAllowedVlans(e.target.value)} />
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={strictMode} onChange={(e) => setStrictMode(e.target.checked)} />
              Strict payload schema
            </label>
            {strictMode ? (
              <p className="hint">Strict mode requires non-empty prefix and Allowed VLANs as all, IDs, or ranges.</p>
            ) : null}
            <button type="submit" disabled={loading || !valid}>
              {loading ? 'Creating profiles...' : 'Create Profiles'}
            </button>
          </form>
        </>
      )}
      {results.map((result, index) => (
        <ApiResult key={`${result.timestamp}-${index}`} result={result} />
      ))}
    </section>
  );
}
