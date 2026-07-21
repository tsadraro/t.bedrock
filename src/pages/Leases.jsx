import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { FileText, AlertTriangle, CheckCircle, Clock, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const STATUS_COLORS = {
  draft: 'secondary',
  pending_tenant_signature: 'outline',
  pending_landlord_signature: 'outline',
  pending_registration: 'outline',
  active: 'default',
  expired: 'secondary',
  terminated: 'destructive',
  disputed: 'destructive',
};

const STATUS_ICONS = {
  active: CheckCircle,
  disputed: AlertTriangle,
  pending_registration: Clock,
};

export default function Leases() {
  const [user, setUser] = useState(null);
  const [leases, setLeases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(async u => {
      setUser(u);
      const isAdmin = u.role === 'admin';
      const isLandlord = u.extra_data?.is_landlord && !isAdmin;
      let data;
      if (isAdmin) data = await base44.entities.Lease.list('-created_date');
      else if (isLandlord) data = await base44.entities.Lease.filter({ landlord_id: u.id }, '-created_date');
      else data = await base44.entities.Lease.filter({ tenant_id: u.id }, '-created_date');
      setLeases(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-heading flex items-center gap-2"><FileText size={22} />
          {user?.role === 'admin' ? 'All Leases' : user?.extra_data?.is_landlord ? 'My Leases' : 'My Leases'}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{leases.length} lease record{leases.length !== 1 ? 's' : ''}</p>
      </div>

      {leases.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p>No leases yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leases.map(lease => {
            const StatusIcon = STATUS_ICONS[lease.status];
            return (
              <Link key={lease.id} to={`/leases/${lease.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-sm truncate">{lease.property_address || 'Property'}</span>
                          <Badge variant={STATUS_COLORS[lease.status] || 'secondary'} className="capitalize text-xs flex items-center gap-1">
                            {StatusIcon && <StatusIcon size={11} />}
                            {lease.status?.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-3 mt-1">
                          <span>{lease.start_date} → {lease.end_date}</span>
                          <span>{lease.rent_amount?.toLocaleString()} ETB/mo</span>
                          <span>Deposit: {lease.deposit_amount?.toLocaleString()} ETB</span>
                        </div>
                        {!lease.addis_housing_registration_ref && lease.status !== 'draft' && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-amber-700">
                            <AlertTriangle size={11} />
                            <span>Registration ref required before activation</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>Escrow: <span className="capitalize font-medium">{lease.escrow_status || 'none'}</span></span>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}