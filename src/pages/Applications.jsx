import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ClipboardList, CheckCircle, XCircle, Clock, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const STATUS_COLORS = {
  pending: 'secondary',
  screening_requested: 'outline',
  screening_complete: 'outline',
  approved: 'default',
  rejected: 'destructive',
  lease_created: 'default',
  withdrawn: 'secondary',
};

export default function Applications() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(async u => {
      setUser(u);
      const isAdmin = u.role === 'admin';
      const isLandlord = u.extra_data?.is_landlord && !isAdmin;
      let apps;
      if (isAdmin) {
        apps = await base44.entities.Application.list('-created_date');
      } else if (isLandlord) {
        apps = await base44.entities.Application.filter({ landlord_id: u.id }, '-created_date');
      } else {
        apps = await base44.entities.Application.filter({ tenant_id: u.id }, '-created_date');
      }
      setApplications(apps);
      setLoading(false);
    });
  }, []);

  async function handleDecision(appId, decision, notes = '') {
    await base44.entities.Application.update(appId, {
      status: decision,
      landlord_decision_notes: notes,
      decided_at: new Date().toISOString(),
    });
    setApplications(apps => apps.map(a => a.id === appId ? { ...a, status: decision } : a));
    toast({ title: `Application ${decision}` });
  }

  const isLandlord = user?.extra_data?.is_landlord && user?.role !== 'admin';
  const isTenant = !user?.extra_data?.is_landlord && user?.role !== 'admin';

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
          <ClipboardList size={22} />
          {isLandlord ? 'Tenant Applications' : 'My Applications'}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{applications.length} application{applications.length !== 1 ? 's' : ''}</p>
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
          <p>{isTenant ? 'No applications yet. Browse properties to apply.' : 'No applications received yet.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map(app => (
            <Card key={app.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm truncate">{app.property_address || 'Property'}</span>
                      <Badge variant={STATUS_COLORS[app.status]} className="capitalize text-xs">
                        {app.status?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    {isLandlord && <p className="text-xs text-muted-foreground">Tenant: <strong>{app.tenant_name}</strong></p>}
                    {isTenant && <p className="text-xs text-muted-foreground">Submitted {new Date(app.created_date).toLocaleDateString()}</p>}
                    {app.applicant_message && <p className="text-xs text-muted-foreground mt-1 italic">"{app.applicant_message}"</p>}
                    {app.landlord_decision_notes && (
                      <p className="text-xs mt-2 p-2 bg-secondary rounded">{app.landlord_decision_notes}</p>
                    )}
                  </div>

                  {isLandlord && app.status === 'pending' && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="text-destructive border-destructive/30"
                        onClick={() => handleDecision(app.id, 'rejected')}>
                        <XCircle size={14} className="mr-1" />Decline
                      </Button>
                      <Button size="sm" onClick={() => handleDecision(app.id, 'approved')}>
                        <CheckCircle size={14} className="mr-1" />Approve
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}