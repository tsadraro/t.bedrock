import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

const STATUS_COLORS = {
  open: 'destructive',
  evidence_requested: 'outline',
  under_review: 'outline',
  resolved_tenant_favor: 'default',
  resolved_landlord_favor: 'default',
  resolved_split: 'default',
  withdrawn: 'secondary',
};

export default function Disputes() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [adminNote, setAdminNote] = useState('');

  useEffect(() => {
    base44.auth.me().then(async u => {
      setUser(u);
      const isAdmin = u.role === 'admin';
      const isLandlord = u.extra_data?.is_landlord && !isAdmin;
      let data;
      if (isAdmin) data = await base44.entities.Dispute.list('-created_date');
      else if (isLandlord) data = await base44.entities.Dispute.filter({ against_id: u.id }, '-created_date');
      else data = await base44.entities.Dispute.filter({ raised_by_id: u.id }, '-created_date');
      setDisputes(data);
      setLoading(false);
    });
  }, []);

  async function requestEvidence(disputeId, note) {
    await base44.entities.Dispute.update(disputeId, { status: 'evidence_requested', evidence_request_note: note });
    await base44.entities.AuditLog.create({
      action_type: 'dispute_evidence_requested',
      actor_id: user.id,
      actor_name: user.full_name || user.email,
      actor_role: 'admin',
      entity_type: 'Dispute',
      entity_id: disputeId,
      reason: note,
    });
    setDisputes(ds => ds.map(d => d.id === disputeId ? { ...d, status: 'evidence_requested', evidence_request_note: note } : d));
    setSelectedDispute(null);
    toast({ title: 'Evidence requested' });
  }

  async function resolveDispute(disputeId, status, notes) {
    const now = new Date().toISOString();
    await base44.entities.Dispute.update(disputeId, { status, resolution_notes: notes, resolved_at: now });
    await base44.entities.AuditLog.create({
      action_type: 'dispute_resolved',
      actor_id: user.id,
      actor_name: user.full_name || user.email,
      actor_role: 'admin',
      entity_type: 'Dispute',
      entity_id: disputeId,
      reason: `Resolved as: ${status}. ${notes}`,
    });
    setDisputes(ds => ds.map(d => d.id === disputeId ? { ...d, status, resolution_notes: notes, resolved_at: now } : d));
    setSelectedDispute(null);
    toast({ title: 'Dispute resolved' });
  }

  const isAdmin = user?.role === 'admin';

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
          <AlertTriangle size={22} />{isAdmin ? 'Dispute Queue' : 'My Disputes'}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {disputes.filter(d => d.status === 'open').length} open · {disputes.length} total
        </p>
      </div>

      {disputes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <AlertTriangle size={40} className="mx-auto mb-3 opacity-30" />
          <p>No disputes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map(dispute => (
            <Card key={dispute.id} className={dispute.status === 'open' ? 'border-amber-300' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant={STATUS_COLORS[dispute.status] || 'secondary'} className="capitalize text-xs">
                        {dispute.status?.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground capitalize">{dispute.dispute_type?.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-sm font-medium">{dispute.property_address || 'Lease dispute'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Raised by <strong>{dispute.raised_by_name}</strong> ({dispute.raised_by_role}) · {new Date(dispute.created_date).toLocaleDateString()}
                    </p>
                    <p className="text-xs mt-2">{dispute.description}</p>
                    {dispute.evidence_request_note && (
                      <div className="text-xs bg-amber-50 border border-amber-200 p-2 rounded mt-2">
                        <strong>Evidence requested:</strong> {dispute.evidence_request_note}
                      </div>
                    )}
                    {dispute.resolution_notes && (
                      <div className="text-xs bg-green-50 border border-green-200 p-2 rounded mt-2">
                        <strong>Resolution:</strong> {dispute.resolution_notes}
                      </div>
                    )}
                  </div>
                  {isAdmin && ['open', 'evidence_requested', 'under_review'].includes(dispute.status) && (
                    <Button size="sm" variant="outline" onClick={() => { setSelectedDispute(dispute); setAdminNote(''); }}>
                      <MessageSquare size={14} className="mr-1" />Review
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedDispute && isAdmin && (
        <Dialog open onOpenChange={() => setSelectedDispute(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Review Dispute</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="text-sm space-y-1 bg-secondary/50 p-3 rounded-lg">
                <p><strong>Type:</strong> {selectedDispute.dispute_type?.replace(/_/g, ' ')}</p>
                <p><strong>Raised by:</strong> {selectedDispute.raised_by_name} ({selectedDispute.raised_by_role})</p>
                <p><strong>Description:</strong> {selectedDispute.description}</p>
                {selectedDispute.deposit_amount_contested && (
                  <p><strong>Amount contested:</strong> {selectedDispute.deposit_amount_contested?.toLocaleString()} ETB</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Admin Note / Decision</label>
                <Textarea className="mt-1" rows={3} value={adminNote} onChange={e => setAdminNote(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => requestEvidence(selectedDispute.id, adminNote)}>Request Evidence</Button>
                <Button size="sm" variant="outline" onClick={() => resolveDispute(selectedDispute.id, 'resolved_tenant_favor', adminNote)}>Tenant Favor</Button>
                <Button size="sm" variant="outline" onClick={() => resolveDispute(selectedDispute.id, 'resolved_landlord_favor', adminNote)}>Landlord Favor</Button>
                <Button size="sm" variant="outline" onClick={() => resolveDispute(selectedDispute.id, 'resolved_split', adminNote)}>Split</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}