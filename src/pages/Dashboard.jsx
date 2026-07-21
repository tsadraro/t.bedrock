import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  Building2, FileText, AlertTriangle, ShieldCheck, ClipboardList,
  Clock, CheckCircle, CalendarDays, Wallet, BadgeCheck, CircleDot,
  ChevronRight, TrendingUp, Users, Lock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

// ── helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-ET', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtETB(n) {
  if (n == null) return '—';
  return `ETB ${Number(n).toLocaleString()}`;
}

// ── small reusable pieces ─────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color = 'blue', href }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  const inner = (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colorMap[color]}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-2xl font-bold font-heading">{value ?? '—'}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link to={href}>{inner}</Link> : inner;
}

// ── Tenant lease card ────────────────────────────────────────────────────────

function ActiveLeaseCard({ lease }) {
  if (!lease) return (
    <Card className="border-dashed">
      <CardContent className="p-6 text-center text-muted-foreground space-y-2">
        <FileText size={28} className="mx-auto opacity-30" />
        <p className="text-sm">No active lease found.</p>
        <Button asChild size="sm" variant="outline"><Link to="/properties">Browse Properties</Link></Button>
      </CardContent>
    </Card>
  );

  const daysLeft = daysUntil(lease.end_date);
  const escrowColors = {
    held: 'bg-green-100 text-green-700',
    hold_pending: 'bg-amber-100 text-amber-700',
    released: 'bg-blue-100 text-blue-700',
    forfeited: 'bg-red-100 text-red-700',
    disputed: 'bg-red-100 text-red-700',
    none: 'bg-gray-100 text-gray-600',
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText size={16} className="text-primary" />Active Lease
          </CardTitle>
          <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Property</p>
            <p className="font-medium">{lease.property_address || '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Landlord</p>
            <p className="font-medium">{lease.landlord_name || '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Monthly Rent</p>
            <p className="font-semibold text-primary">{fmtETB(lease.rent_amount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Deposit</p>
            <p className="font-medium">{fmtETB(lease.deposit_amount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Lease End</p>
            <p className="font-medium">{fmtDate(lease.end_date)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Escrow Status</p>
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${escrowColors[lease.escrow_status] || escrowColors.none}`}>
              {(lease.escrow_status || 'none').replace('_', ' ')}
            </span>
          </div>
        </div>

        {daysLeft !== null && daysLeft <= 60 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <AlertTriangle size={14} />
            {daysLeft > 0 ? `Lease expires in ${daysLeft} days` : 'Lease has expired'}
          </div>
        )}

        <Link to={`/leases/${lease.id}`}>
          <Button size="sm" variant="outline" className="w-full mt-1">
            View Full Lease <ChevronRight size={14} className="ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

// ── Upcoming payment card ────────────────────────────────────────────────────

function UpcomingPaymentCard({ lease }) {
  if (!lease) return null;

  // Calculate next payment date based on payment schedule from lease start
  const today = new Date();
  const start = new Date(lease.start_date);
  let nextDate = new Date(start);
  while (nextDate <= today) {
    const schedule = lease.payment_schedule || 'monthly';
    if (schedule === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
    else if (schedule === 'quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
    else if (schedule === 'biannual') nextDate.setMonth(nextDate.getMonth() + 6);
    else nextDate.setFullYear(nextDate.getFullYear() + 1);
  }

  const days = daysUntil(nextDate.toISOString().split('T')[0]);
  const urgency = days <= 3 ? 'red' : days <= 7 ? 'amber' : 'green';
  const urgencyMap = {
    red: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', icon: 'text-red-500' },
    amber: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', icon: 'text-amber-500' },
    green: { bg: 'bg-green-50 border-green-200', text: 'text-green-800', icon: 'text-green-500' },
  };
  const c = urgencyMap[urgency];

  return (
    <Card className={`border ${c.bg}`}>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${c.bg}`}>
          <CalendarDays size={20} className={c.icon} />
        </div>
        <div className="flex-1">
          <p className={`text-xs font-medium ${c.text}`}>Next Rent Payment</p>
          <p className={`text-lg font-bold font-heading ${c.text}`}>{fmtETB(lease.rent_amount)}</p>
          <p className={`text-xs ${c.text} opacity-80`}>Due {fmtDate(nextDate.toISOString().split('T')[0])} · {days} day{days !== 1 ? 's' : ''} away</p>
        </div>
        <Wallet size={18} className={c.icon} />
      </CardContent>
    </Card>
  );
}

// ── Verification progress card ────────────────────────────────────────────────

function VerificationCard({ profile }) {
  const steps = [
    { label: 'Profile Created', done: !!profile },
    { label: 'Fayda ID Submitted', done: profile?.fayda_id && profile?.fayda_verification_status !== 'not_submitted' },
    { label: 'Identity Verified', done: profile?.fayda_verification_status === 'verified' },
    { label: 'Consent Granted', done: profile?.consent_identity_financial },
  ];
  const completed = steps.filter(s => s.done).length;
  const pct = Math.round((completed / steps.length) * 100);

  const statusColor = {
    not_submitted: 'bg-gray-100 text-gray-600',
    pending: 'bg-amber-100 text-amber-700',
    verified: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };
  const verStatus = profile?.fayda_verification_status || 'not_submitted';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BadgeCheck size={16} className="text-primary" />Verification Progress
          </CardTitle>
          <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${statusColor[verStatus]}`}>
            {verStatus.replace('_', ' ')}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>{completed} of {steps.length} steps complete</span>
            <span>{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>
        <div className="space-y-2">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2.5 text-sm">
              {s.done
                ? <CheckCircle size={15} className="text-green-500 shrink-0" />
                : <CircleDot size={15} className="text-muted-foreground shrink-0" />}
              <span className={s.done ? 'text-foreground' : 'text-muted-foreground'}>{s.label}</span>
            </div>
          ))}
        </div>
        {pct < 100 && (
          <Button asChild size="sm" variant="outline" className="w-full">
            <Link to="/tenant-profile">Complete Verification <ChevronRight size={14} className="ml-1" /></Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({});
  const [activeLease, setActiveLease] = useState(null);
  const [tenantProfile, setTenantProfile] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      loadData(u);
    });
  }, []);

  async function loadData(u) {
    const isAdmin = u?.role === 'admin';
    const isLandlord = u?.extra_data?.is_landlord && !isAdmin;

    try {
      if (isAdmin) {
        const [props, leases, disputes, dreqs, logs] = await Promise.all([
          base44.entities.Property.list(),
          base44.entities.Lease.list(),
          base44.entities.Dispute.filter({ status: 'open' }),
          base44.entities.DataRightsRequest.filter({ status: 'pending' }),
          base44.entities.AuditLog.list('-created_date', 6),
        ]);
        setStats({
          properties: props.length,
          active_leases: leases.filter(l => l.status === 'active').length,
          open_disputes: disputes.length,
          pending_data_requests: dreqs.length,
          total_users: null,
        });
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
        const [apps, leases, profiles] = await Promise.all([
          base44.entities.Application.filter({ tenant_id: u.id }),
          base44.entities.Lease.filter({ tenant_id: u.id }),
          base44.entities.TenantProfile.filter({ user_id: u.id }),
        ]);
        const lease = leases.find(l => l.status === 'active') || leases[0] || null;
        setActiveLease(lease);
        setTenantProfile(profiles[0] || null);
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

  const isAdmin = user?.role === 'admin';
  const isLandlord = user?.extra_data?.is_landlord && !isAdmin;
  const isTenant = !isAdmin && !isLandlord;

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading">
          Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {isAdmin ? 'T.Bedrock & Co. — Admin Dashboard' : isLandlord ? 'Landlord / Agent Dashboard' : 'Tenant Dashboard'}
        </p>
      </div>

      {/* ── TENANT VIEW ── */}
      {isTenant && (
        <>
          {/* Stat row */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard icon={ClipboardList} label="Applications" value={stats.applications} color="blue" href="/applications" />
            <StatCard icon={Clock} label="Pending" value={stats.pending_apps} color="amber" href="/applications" />
            <StatCard icon={FileText} label="Active Leases" value={stats.active_leases} color="green" href="/leases" />
          </div>

          {/* Main panels */}
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="space-y-4">
              <ActiveLeaseCard lease={activeLease} />
              {activeLease && <UpcomingPaymentCard lease={activeLease} />}
            </div>
            <VerificationCard profile={tenantProfile} />
          </div>

          {/* Quick actions */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild size="sm"><Link to="/properties">Browse Properties</Link></Button>
              <Button variant="outline" size="sm" asChild><Link to="/tenant-profile">My Profile</Link></Button>
              <Button variant="outline" size="sm" asChild><Link to="/data-rights">Data Rights</Link></Button>
              {activeLease && <Button variant="outline" size="sm" asChild><Link to={`/leases/${activeLease.id}`}>View Lease</Link></Button>}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── LANDLORD VIEW ── */}
      {isLandlord && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Building2} label="My Properties" value={stats.properties} color="blue" href="/properties" />
            <StatCard icon={ClipboardList} label="Pending Apps" value={stats.active_apps} color="amber" href="/applications" />
            <StatCard icon={FileText} label="Active Leases" value={stats.active_leases} color="green" href="/leases" />
            <StatCard icon={AlertTriangle} label="Open Disputes" value={stats.open_disputes} color="red" href="/disputes" />
          </div>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild size="sm"><Link to="/properties/new">+ New Listing</Link></Button>
              <Button variant="outline" size="sm" asChild><Link to="/applications">Review Applications</Link></Button>
              <Button variant="outline" size="sm" asChild><Link to="/leases">View Leases</Link></Button>
              <Button variant="outline" size="sm" asChild><Link to="/disputes">Disputes</Link></Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* ── ADMIN VIEW ── */}
      {isAdmin && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Building2} label="Properties" value={stats.properties} color="blue" href="/properties" />
            <StatCard icon={FileText} label="Active Leases" value={stats.active_leases} color="green" href="/leases" />
            <StatCard icon={AlertTriangle} label="Open Disputes" value={stats.open_disputes} color="amber" href="/disputes" />
            <StatCard icon={ShieldCheck} label="Data Requests" value={stats.pending_data_requests} color="red" href="/data-rights" />
          </div>

          {/* Recent activity */}
          {recentActivity.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                  <Link to="/audit-log" className="text-xs text-primary hover:underline">View all</Link>
                </div>
              </CardHeader>
              <CardContent className="divide-y">
                {recentActivity.map(log => (
                  <div key={log.id} className="py-2.5 flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-primary/40 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium capitalize">{log.action_type?.replace(/_/g, ' ')}</span>
                      {log.actor_name && <span className="text-muted-foreground"> · {log.actor_name}</span>}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {log.created_date ? new Date(log.created_date).toLocaleDateString() : ''}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild><Link to="/disputes">Review Disputes</Link></Button>
                <Button variant="outline" size="sm" asChild><Link to="/audit-log">Audit Log</Link></Button>
                <Button variant="outline" size="sm" asChild><Link to="/incident-log">Incident Log</Link></Button>
                <Button variant="outline" size="sm" asChild><Link to="/system-config">System Config</Link></Button>
                <Button variant="outline" size="sm" asChild><Link to="/users">Manage Users</Link></Button>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Statutory Limits</p>
                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                      Min lease: 24 months · Max advance: 2 months · Annual rent cap: 11.5%.<br />
                      Manage in <Link to="/system-config" className="underline">System Config</Link>.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}