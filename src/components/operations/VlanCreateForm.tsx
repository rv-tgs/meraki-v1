import { FormEvent, useState } from 'react';
import type { OperationResult } from '../../types/meraki';
import { isRequired, isValidCidr, isValidIpv4, isValidVlanId } from '../../utils/validators';
import ApiResult from '../common/ApiResult';

interface VlanCreateFormProps {
  networkId: string;
  submit: (payload: { id: string; name: string; subnet: string; applianceIp: string }) => Promise<OperationResult>;
}

export default function VlanCreateForm({ networkId, submit }: VlanCreateFormProps) {
  const [id, setId] = useState('10');
  const [name, setName] = useState('Users');
  const [subnet, setSubnet] = useState('192.168.10.0/24');
  const [applianceIp, setApplianceIp] = useState('192.168.10.1');
  const [strictMode, setStrictMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OperationResult>();

  const strictValid = !strictMode || (isValidCidr(subnet) && isValidIpv4(applianceIp));
  const valid = isValidVlanId(id) && isRequired(name) && isRequired(subnet) && isRequired(applianceIp) && strictValid;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    setLoading(true);
    const response = await submit({ id: id.trim(), name: name.trim(), subnet: subnet.trim(), applianceIp: applianceIp.trim() });
    setResult(response);
    setLoading(false);
  };

  return (
    <section className="card">
      <h3>Create VLAN</h3>
      <p>Network: {networkId}</p>
      <form className="grid" onSubmit={onSubmit}>
        <label>
          VLAN ID
          <input type="number" min={1} max={4094} value={id} onChange={(e) => setId(e.target.value)} />
        </label>
        <label>
          VLAN Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Subnet (CIDR)
          <input value={subnet} onChange={(e) => setSubnet(e.target.value)} />
        </label>
        <label>
          Appliance IP
          <input value={applianceIp} onChange={(e) => setApplianceIp(e.target.value)} />
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={strictMode} onChange={(e) => setStrictMode(e.target.checked)} />
          Strict payload schema
        </label>
        {strictMode ? (
          <p className="hint">Strict mode validates Subnet as CIDR and Appliance IP as IPv4 address.</p>
        ) : null}
        <button type="submit" disabled={loading || !valid}>{loading ? 'Creating...' : 'Create VLAN'}</button>
      </form>
      <ApiResult result={result} />
    </section>
  );
}
