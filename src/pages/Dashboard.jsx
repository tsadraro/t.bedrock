import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Building2, FileText, AlertTriangle, ShieldCheck, ClipboardList, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

function StatCard({ icon: Icon, label, value, color = 'blue', href }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  };
  const card = (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colorMap[color]}`}>
          <Icon size={22} />
        </div>
        <div>
          <p className="text-2xl font-bold font-heading">{value ?? '—'}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link to={href}>{card}</Link> : card;
}

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({});
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      loadStats(u);
    });
  }, []);

  async function loadStats(u) {
    const role = u?.role;
    const isAdmin = role === 'admin';
    const isLandlord = u?.extra_data?.is_landlord && !isAdmin;

    try {
      if (isAdmin) {
        const [props, leases, disputes, dreqs] = await Promise.all([
          base44.entities.Property.list(),
          base44.entities.Lease.list(),
          base44.entities.Dispute.filter({ status: 'open' }),
          base44.entities.DataRightsRequest.filter({ status: 'pending' }),
        ]);
        setStats({
          properties: props.length,
          active_leases: leases.filter(l => l.status === 'active').length,
          open_disputes: disputes.length,
          pending_data_requests: dreqs.length,
        });
        const logs = await base44.entities.AuditLog.list('-created_date', 8);
        setRecentActivity(logs);
      } else if (isLandlord) {
        const [props, apps, disputes] = await Promise.all([
          base44.entities.Property.filter({ landlord_id: u.id }),
          base44.entities.Application.filter({ landlord_id: u.id }),
          base44.entities.Dispute.filter({ against_id: u.id }),
        ]);
        setStats({
          properties: props.length,
          active_apps: apps.filter(a => ['pending', 'screening_requested'].includes(a.status)).length,
          active_leases: props.filter(p => p.status === 'rented').length,
          open_disputes: disputes.filter(d => d.status === 'open').length,
        });
      } else {
        const [apps, leases] = await Promise.all([
          base44.entities.Application.filter({ tenant_id: u.id }),
          base44.entities.Lease.filter({ tenant_id: u.id }),
        ]);
        setStats({
          applications: apps.length,
          active_leases: leases.filter(l => l.status === 'active').length,
          pending_apps: apps.filter(a => a.status === 'pending').length,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  const role = user?.role;
  const isAdmin = role === 'admin';
  const isLandlord = user?.extra_data?.is_landlord && !isAdmin;

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">
          Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isAdmin ? 'T.Bedrock Admin Dashboard' : isLandlord ? 'Landlord / Agent Dashboard' : 'Tenant Dashboard'}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isAdmin && <>
          <StatCard icon={Building2} label="Properties" value={stats.properties} color="blue" href="/properties" />
          <StatCard icon={FileText} label="Active Leases" value={stats.active_leases} color="green" href="/leases" />
          <StatCard icon={AlertTriangle} label="Open Disputes" value={stats.open_disputes} color="amber" href="/disputes" />
          <StatCard icon={ShieldCheck} label="Data Requests" value={stats.pending_data_requests} color="red" href="/data-requests" />
        </>}
        {isLandlord && <>
          <StatCard icon={Building2} label="My Properties" value={stats.properties} color="blue" href="/properties" />
          <StatCard icon={ClipboardList} label="Pending Apps" value={stats.active_apps} color="amber" href="/applications" />
          <StatCard icon={FileText} label="Active Leases" value={stats.active_leases} color="green" href="/leases" />
          <StatCard icon={AlertTriangle} label="Open Disputes" value={stats.open_disputes} color="red" href="/disputes" />
        </>}
        {!isAdmin && !isLandlord && <>
          <StatCard icon={ClipboardList} label="Applications" value={stats.applications} color="blue" href="/applications" />
          <StatCard icon={Clock} label="Pending" value={stats.pending_apps} color="amber" href="/applications" />
          <StatCard icon={FileText} label="Active Leases" value={stats.active_leases} color="green" href="/leases" />
          <StatCard icon={CheckCircle} label="Profile" value="View" color="blue" href="/tenant-profile" />
        </>}
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {isAdmin && <>
            <Button variant="outline" size="sm" asChild><Link to="/disputes">Review Disputes</Link></Button>
            <Button variant="outline" size="sm" asChild><Link to="/audit-log">View Audit Log</Link></Button>
            <Button variant="outline" size="sm" asChild><Link to="/incident-log">Incident Log</Link></Button>
            <Button variant="outline" size="sm" asChild><Link to="/system-config">System Config</Link></Button>
          </>}
          {isLandlord && <>
            <Button asChild size="sm"><Link to="/properties/new">+ New Listing</Link></Button>
            <Button variant="outline" size="sm" asChild><Link to="/applications">Review Applications</Link></Button>
          </>}
          {!isAdmin && !isLandlord && <>
            <Button asChild size="sm"><Link to="/properties">Browse Properties</Link></Button>
            <Button variant="outline" size="sm" asChild><Link to="/tenant-profile">Complete Profile</Link></Button>
            <Button variant="outline" size="sm" asChild><Link to="/data-rights">Data Rights</Link></Button>
          </>}
        </CardContent>
      </Card>

      {/* Compliance note for admin */}
      {isAdmin && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Statutory Configuration</p>
                <p className="text-xs text-amber-700 mt-1">
                  Minimum lease: 24 months · Max advance: 2 months · Annual rent cap: 11.5%.
                  All values are configurable in <Link to="/system-config" className="underline">System Config</Link>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}