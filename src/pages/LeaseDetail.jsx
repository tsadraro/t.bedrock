import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { FileText, ArrowLeft, AlertTriangle, CheckCircle, Shield, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';

const STATUS_COLORS = {
  draft: 'secondary', pending_tenant_signature: 'outline', pending_landlord_signature: 'outline',
  pending_registration: 'outline', active: 'default', expired: 'secondary',
  terminated: 'destructive', disputed: 'destructive',
};

const ESCROW_COLORS = { none: 'secondary', hold_pending: 'outline', held: 'default', released: 'secondary', forfeited: 'destructive', disputed: 'destructive' };

export default function LeaseDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [lease, setLease] = useState(null);
  const [clauses, setClauses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.auth.me(),
      base44.entities.Lease.get(id),
      base44.entities.ForfeitureClause.filter({ lease_id: id }),
    ]).then(([u, l, cl]) => {
      setUser(u);
      setLease(l);
      setClauses(cl);
      setLoading(false);
    });
  }, [id]);

  async function sign(role) {
    const field = role === 'tenant' ? 'tenant_signed_at' : 'landlord_signed_at';
    const now = new Date().toISOString();
    const update = { [field]: now };

    // Advance status if both parties have signed
    const otherSigned = role === 'tenant' ? lease.landlord_signed_at : lease.tenant_signed_at;
    if (otherSigned) update.status = 'pending_registration';
    else update.status = role === 'tenant' ? 'pending_landlord_signature' : 'pending_tenant_signature';

    const updated = await base44.entities.Lease.update(id, update);
    await base44.entities.AuditLog.create({
      action_type: role === 'tenant' ? 'lease_signed_tenant' : 'lease_signed_landlord',
      actor_id: user.id, actor_name: user.full_name || user.email, actor_role: role,
      entity_type: 'Lease', entity_id: id,
    });
    setLease(updated);
    toast({ title: `Lease signed by ${role}` });
  }

  async function activateLease() {
    if (!lease.addis_housing_registration_ref) {
      toast({ title: 'Enter registration reference first', variant: 'destructive' }); return;
    }
    const updated = await base44.entities.Lease.update(id, { status: 'active', escrow_status: 'hold_pending' });
    await base44.entities.AuditLog.create({
      action_type: 'lease_activated', actor_id: user.id, actor_name: user.full_name || user.email,
      actor_role: user.role, entity_type: 'Lease', entity_id: id,
    });
    setLease(updated);
    toast({ title: 'Lease activated — escrow hold initiated' });
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (!lease) return <div className="text-center py-20 text-muted-foreground">Lease not found.</div>;

  const isAdmin = user?.role === 'admin';
  const isTenant = user?.id === lease.tenant_id;
  const isLandlord = user?.id === lease.landlord_id;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/leases"><Button variant="ghost" size="icon"><ArrowLeft size={18} /></Button></Link>
        <div>
          <h1 className="text-xl font-bold font-heading flex items-center gap-2">
            <FileText size={20} />{lease.property_address || 'Lease'}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={STATUS_COLORS[lease.status] || 'secondary'} className="capitalize text-xs">
              {lease.status?.replace(/_/g, ' ')}
            </Badge>
            <Badge variant={ESCROW_COLORS[lease.escrow_status] || 'secondary'} className="capitalize text-xs">
              Escrow: {lease.escrow_status?.replace(/_/g, ' ') || 'none'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Registration warning */}
      {!lease.addis_housing_registration_ref && lease.status !== 'draft' && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle size={15} className="text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm">
            Addis Ababa Housing Registration reference required before activation (Proclamation No. 1320/2024).
          </AlertDescription>
        </Alert>
      )}

      {/* Lease terms */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Lease Terms</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
          <div><p className="text-xs text-muted-foreground">Tenant</p><p className="font-medium">{lease.tenant_name}</p></div>
          <div><p className="text-xs text-muted-foreground">Landlord</p><p className="font-medium">{lease.landlord_name}</p></div>
          <div><p className="text-xs text-muted-foreground">Start</p><p className="font-medium">{lease.start_date}</p></div>
          <div><p className="text-xs text-muted-foreground">End</p><p className="font-medium">{lease.end_date}</p></div>
          <div><p className="text-xs text-muted-foreground">Monthly Rent</p><p className="font-medium">{lease.rent_amount?.toLocaleString()} ETB</p></div>
          <div><p className="text-xs text-muted-foreground">Deposit</p><p className="font-medium">{lease.deposit_amount?.toLocaleString()} ETB</p></div>
          <div><p className="text-xs text-muted-foreground">Advance Months</p><p className="font-medium">{lease.advance_months ?? '—'}</p></div>
          <div><p className="text-xs text-muted-foreground">Payment Schedule</p><p className="font-medium capitalize">{lease.payment_schedule}</p></div>
          {lease.annual_increase_cap_percent && (
            <div><p className="text-xs text-muted-foreground">Annual Increase Cap</p><p className="font-medium">{lease.annual_increase_cap_percent}%</p></div>
          )}
          {lease.addis_housing_registration_ref && (
            <div className="col-span-2"><p className="text-xs text-muted-foreground">Registration Ref</p><p className="font-medium font-mono">{lease.addis_housing_registration_ref}</p></div>
          )}
        </CardContent>
      </Card>

      {/* Signatures */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Signatures</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {lease.tenant_signed_at ? <CheckCircle size={16} className="text-green-500" /> : <Clock size={16} className="text-muted-foreground" />}
              <span>Tenant</span>
            </div>
            {lease.tenant_signed_at
              ? <span className="text-xs text-muted-foreground">{new Date(lease.tenant_signed_at).toLocaleString()}</span>
              : isTenant && lease.status !== 'active' && <Button size="sm" onClick={() => sign('tenant')}>Sign</Button>
            }
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {lease.landlord_signed_at ? <CheckCircle size={16} className="text-green-500" /> : <Clock size={16} className="text-muted-foreground" />}
              <span>Landlord</span>
            </div>
            {lease.landlord_signed_at
              ? <span className="text-xs text-muted-foreground">{new Date(lease.landlord_signed_at).toLocaleString()}</span>
              : isLandlord && lease.status !== 'active' && <Button size="sm" onClick={() => sign('landlord')}>Sign</Button>
            }
          </div>
        </CardContent>
      </Card>

      {/* Forfeiture clauses */}
      {clauses.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Shield size={16} />Forfeiture Clauses</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {clauses.map(c => (
              <div key={c.id} className="border rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{c.title}</span>
                  <Badge variant="outline" className="text-xs capitalize">{c.category?.replace(/_/g, ' ')}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{c.description}</p>
                <p className="text-xs mt-1">
                  Forfeiture: {c.forfeiture_type === 'percentage' ? `${c.forfeiture_percentage}%` : c.forfeiture_type === 'partial' ? `${c.forfeiture_fixed_amount?.toLocaleString()} ETB` : 'Full deposit'}
                </p>
                <div className="flex gap-3 mt-2 text-xs">
                  <span className={c.tenant_agreed ? 'text-green-600' : 'text-muted-foreground'}>
                    {c.tenant_agreed ? '✓ Tenant agreed' : 'Tenant pending'}
                  </span>
                  <span className={c.landlord_agreed ? 'text-green-600' : 'text-muted-foreground'}>
                    {c.landlord_agreed ? '✓ Landlord agreed' : 'Landlord pending'}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Admin activate */}
      {isAdmin && lease.status === 'pending_registration' && (
        <Button className="w-full" onClick={activateLease}>Activate Lease & Initiate Escrow Hold</Button>
      )}

      {lease.notes && (
        <Card><CardContent className="p-4 text-sm text-muted-foreground">{lease.notes}</CardContent></Card>
      )}
    </div>
  );
}