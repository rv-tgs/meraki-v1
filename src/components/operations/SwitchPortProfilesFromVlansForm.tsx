import type { NetworkSwitchPortProfile, OperationResult } from '../../types/meraki';
import ApiResult from '../common/ApiResult';

interface SwitchPortProfilesFromVlansFormProps {
  autoProfileResults: OperationResult[];
  networkProfiles: NetworkSwitchPortProfile[];
  loadingProfiles: boolean;
  profilesError?: string;
  onRefreshProfiles: () => Promise<void>;
}

export default function SwitchPortProfilesFromVlansForm({
  autoProfileResults,
  networkProfiles,
  loadingProfiles,
  profilesError,
  onRefreshProfiles
}: SwitchPortProfilesFromVlansFormProps) {
  return (
    <section className="card">
      <h3>Switch Port Profiles</h3>
      <p className="hint">Profiles are auto-created after successful VLAN creation, then listed from GET switch port profiles.</p>

      <div className="toolbar-row">
        <button type="button" className="secondary" onClick={() => void onRefreshProfiles()} disabled={loadingProfiles}>
          {loadingProfiles ? 'Refreshing profiles...' : 'Refresh Profiles (GET)'}
        </button>
      </div>

      {profilesError ? <p className="error">{profilesError}</p> : null}

      <h4>Auto-Creation Results</h4>
      {autoProfileResults.length === 0 ? (
        <p>No auto-created switch profiles yet. Deploy VLANs first.</p>
      ) : (
        autoProfileResults.map((result, index) => <ApiResult key={`${result.timestamp}-${index}`} result={result} />)
      )}

      <h4>GET /networks/:networkId/switch/ports/profiles</h4>
      {networkProfiles.length === 0 ? (
        <p>No switch port profiles returned yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="vlan-table">
            <thead>
              <tr>
                <th>Profile ID</th>
                <th>Name</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {networkProfiles.map((profile, index) => (
                <tr key={String(profile.id || profile.profileId || index)}>
                  <td>{String(profile.id || profile.profileId || '-')}</td>
                  <td>{String(profile.name || '-')}</td>
                  <td>{String(profile.description || '-')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
