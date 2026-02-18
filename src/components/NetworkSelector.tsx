import type { Network } from '../types/meraki';

interface NetworkSelectorProps {
  loading: boolean;
  networks: Network[];
  selectedNetworkId: string;
  onSelect: (networkId: string) => void;
}

export default function NetworkSelector({
  loading,
  networks,
  selectedNetworkId,
  onSelect
}: NetworkSelectorProps) {
  return (
    <section className="card">
      <h2>Select Network</h2>
      {loading ? <p>Loading organization networks...</p> : null}
      {!loading && networks.length === 0 ? <p>No networks found for the selected organization.</p> : null}
      {!loading && networks.length > 0 ? (
        <div className="stack">
          <label htmlFor="network">Organization Networks</label>
          <select
            id="network"
            value={selectedNetworkId}
            onChange={(event) => onSelect(event.target.value)}
          >
            <option value="">Choose a network</option>
            {networks.map((network) => (
              <option value={network.id} key={network.id}>
                {network.name} ({network.id})
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </section>
  );
}
