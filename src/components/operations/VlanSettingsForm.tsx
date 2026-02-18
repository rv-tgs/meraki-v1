import { FormEvent, useState } from 'react';
import type { OperationResult } from '../../types/meraki';
import ApiResult from '../common/ApiResult';

interface VlanSettingsFormProps {
  networkId: string;
  submit: (payload: { vlansEnabled: boolean; mandatoryDhcp: { enabled: boolean } }) => Promise<OperationResult>;
}

export default function VlanSettingsForm({ networkId, submit }: VlanSettingsFormProps) {
  const [vlansEnabled, setVlansEnabled] = useState(true);
  const [mandatoryDhcp, setMandatoryDhcp] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OperationResult>();

  const valid = !vlansEnabled || mandatoryDhcp;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    setLoading(true);
    const response = await submit({ vlansEnabled, mandatoryDhcp: { enabled: mandatoryDhcp } });
    setResult(response);
    setLoading(false);
  };

  return (
    <section className="card">
      <h3>Appliance VLAN Settings</h3>
      <p>Network: {networkId}</p>
      <p className="hint">Required: when VLANs are enabled, Mandatory DHCP must remain enabled.</p>
      <form className="grid" onSubmit={onSubmit}>
        <label className="checkbox">
          <input type="checkbox" checked={vlansEnabled} onChange={(e) => setVlansEnabled(e.target.checked)} /> VLANs Enabled
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={mandatoryDhcp} onChange={(e) => setMandatoryDhcp(e.target.checked)} /> Mandatory DHCP Enabled
        </label>
        <button type="submit" disabled={loading || !valid}>{loading ? 'Updating...' : 'Update VLAN Settings'}</button>
      </form>
      <ApiResult result={result} />
    </section>
  );
}
