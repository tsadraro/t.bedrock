import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { BarChart3, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const ACTION_COLORS = {
  escrow_hold_created: 'bg-blue-100 text-blue-700',
  escrow_released: 'bg-green-100 text-green-700',
  escrow_forfeited: 'bg-red-100 text-red-700',
  escrow_disputed: 'bg-amber-100 text-amber-700',
  lease_created: 'bg-purple-100 text-purple-700',
  lease_signed_tenant: 'bg-purple-100 text-purple-700',
  lease_signed_landlord: 'bg-purple-100 text-purple-700',
  lease_activated: 'bg-green-100 text-green-700',
  dispute_opened: 'bg-amber-100 text-amber-700',
  dispute_resolved: 'bg-green-100 text-green-700',
  data_rights_request: 'bg-blue-100 text-blue-700',
  consent_granted: 'bg-green-100 text-green-700',
  consent_revoked: 'bg-red-100 text-red-700',
  property_listed: 'bg-blue-100 text-blue-700',
  application_submitted: 'bg-blue-100 text-blue-700',
  system_config_changed: 'bg-red-100 text-red-700',
};

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => {
    base44.auth.me().then(u => { setUser(u); loadLogs(); });
  }, []);

  async function loadLogs() {
    const data = await base44.entities.AuditLog.list('-created_date', 200);
    setLogs(data);
    setLoading(false);
  }

  const filtered = logs.filter(l => {
    const matchSearch = !search ||
      l.action_type?.includes(search.toLowerCase()) ||
      l.actor_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.reason?.toLowerCase().includes(search.toLowerCase());
    const matchAction = actionFilter === 'all' || l.action_type === actionFilter;
    return matchSearch && matchAction;
  });

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (user?.role !== 'admin') return <div className="text-center py-20 text-muted-foreground">Access restricted.</div>;
  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-heading flex items-center gap-2"><BarChart3 size={22} />Audit Log</h1>
        <p className="text-muted-foreground text-sm mt-1">Immutable record of all platform actions.</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search logs…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-52">
            <Filter size={14} className="mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="escrow_hold_created">Escrow Hold</SelectItem>
            <SelectItem value="escrow_released">Escrow Released</SelectItem>
            <SelectItem value="escrow_forfeited">Escrow Forfeited</SelectItem>
            <SelectItem value="dispute_opened">Dispute Opened</SelectItem>
            <SelectItem value="lease_activated">Lease Activated</SelectItem>
            <SelectItem value="data_rights_request">Data Rights</SelectItem>
            <SelectItem value="system_config_changed">Config Changed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} entries</p>

      <div className="space-y-2">
        {paginated.length === 0 && <div className="text-center py-12 text-muted-foreground">No log entries found.</div>}
        {paginated.map(log => (
          <Card key={log.id}>
            <CardContent className="p-3 flex items-start gap-3">
              <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium shrink-0 mt-0.5 ${ACTION_COLORS[log.action_type] || 'bg-secondary text-foreground'}`}>
                {log.action_type?.replace(/_/g, ' ')}
              </span>
              <div className="flex-1 min-w-0 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{log.actor_name || log.actor_id}</span>
                  <Badge variant="outline" className="text-xs capitalize">{log.actor_role}</Badge>
                  {log.amount && <span className="text-muted-foreground">{log.amount.toLocaleString()} {log.currency || 'ETB'}</span>}
                </div>
                {log.reason && <p className="text-muted-foreground text-xs mt-0.5 truncate">{log.reason}</p>}
              </div>
              <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                {new Date(log.created_date).toLocaleString()}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center gap-3 justify-center">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page + 1} of {Math.ceil(filtered.length / PAGE_SIZE)}</span>
          <Button variant="outline" size="sm" disabled={(page + 1) * PAGE_SIZE >= filtered.length} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}