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
  const [strictMode, setStrictMode] = useState(false);
  const [limitUp, setLimitUp] = useState(10);
  const [limitDown, setLimitDown] = useState(20);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OperationResult>();

  const strictValid = !strictMode || (limitUp > 0 && limitDown > 0);
  const valid = isRequired(name) && strictValid;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;

    const payload: GroupPolicyPayload = { name: name.trim() };
    if (strictMode) {
      payload.scheduling = { enabled: true };
      payload.bandwidth = {
        settings: 'custom',
        bandwidthLimits: { limitUp, limitDown }
      };
    }

    setLoading(true);
    const response = await submit(payload);
    setResult(response);
    setLoading(false);
  };

  return (
    <section className="card">
      <h3>Create Group Policy</h3>
      <p>Network: {networkId}</p>
      <form className="grid" onSubmit={onSubmit}>
        <label>
          Policy Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={strictMode} onChange={(e) => setStrictMode(e.target.checked)} />
          Strict payload schema
        </label>
        {strictMode ? (
          <>
            <label>
              Upstream Limit (Kbps)
              <input type="number" min={1} value={limitUp} onChange={(e) => setLimitUp(Number(e.target.value))} />
            </label>
            <label>
              Downstream Limit (Kbps)
              <input type="number" min={1} value={limitDown} onChange={(e) => setLimitDown(Number(e.target.value))} />
            </label>
          </>
        ) : null}
        <button type="submit" disabled={loading || !valid}>
          {loading ? 'Creating...' : 'Create Policy'}
        </button>
      </form>
      <ApiResult result={result} />
    </section>
  );
}
