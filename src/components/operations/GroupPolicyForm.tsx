import { FormEvent, useState } from 'react';
import type { GroupPolicyPayload, OperationResult } from '../../types/meraki';
import { isRequired } from '../../utils/validators';
import ApiResult from '../common/ApiResult';

interface GroupPolicyFormProps {
  networkId: string;
  submit: (payload: GroupPolicyPayload) => Promise<OperationResult>;
}

export default function GroupPolicyForm({ networkId, submit }: GroupPolicyFormProps) {
  const [name, setName] = useState('Standard Policy');
  const [limitUp, setLimitUp] = useState(10);
  const [limitDown, setLimitDown] = useState(20);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OperationResult>();

  const valid = isRequired(name) && limitUp > 0 && limitDown > 0;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;

    const payload: GroupPolicyPayload = {
      name: name.trim(),
      scheduling: { enabled: true },
      bandwidth: {
        settings: 'custom',
        bandwidthLimits: { limitUp, limitDown }
      }
    };

    setLoading(true);
    const response = await submit(payload);
    setResult(response);
    setLoading(false);
  };

  return (
    <section className="card">
      <h3>Create Group Policy</h3>
      <p>Network: {networkId}</p>
      <p className="hint">Required: custom bandwidth limits and scheduling are always included.</p>
      <form className="grid" onSubmit={onSubmit}>
        <label>
          Policy Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Upstream Limit (Kbps)
          <input type="number" min={1} value={limitUp} onChange={(e) => setLimitUp(Number(e.target.value))} />
        </label>
        <label>
          Downstream Limit (Kbps)
          <input type="number" min={1} value={limitDown} onChange={(e) => setLimitDown(Number(e.target.value))} />
        </label>
        <button type="submit" disabled={loading || !valid}>
          {loading ? 'Creating...' : 'Create Policy'}
        </button>
      </form>
      <ApiResult result={result} />
    </section>
  );
}
