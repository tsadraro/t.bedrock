import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ShieldCheck, Download, Edit, Trash2, PauseCircle, AlertOctagon, User, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

const REQUEST_TYPES = [
  {
    type: 'access_export',
    icon: Download,
    title: 'Access My Data',
    description: 'Request an export of all personal data T.Bedrock holds about you, including identity records, rental history, consent logs, and audit entries.',
    cta: 'Request Data Export',
    color: 'blue',
  },
  {
    type: 'correct_data',
    icon: Edit,
    title: 'Correct My Data',
    description: 'Request correction of inaccurate or incomplete personal data. Specify what needs to change.',
    cta: 'Request Correction',
    color: 'green',
  },
  {
    type: 'delete_account',
    icon: Trash2,
    title: 'Delete My Account & Data',
    description: 'Request deletion of your account and personal data. Note: financial records and lease documents may be retained for the legally required period.',
    cta: 'Request Deletion',
    color: 'red',
  },
  {
    type: 'restrict_processing',
    icon: PauseCircle,
    title: 'Restrict Processing',
    description: 'Request that T.Bedrock restrict how your data is processed while a dispute or objection is being resolved.',
    cta: 'Request Restriction',
    color: 'amber',
  },
  {
    type: 'object_automated_processing',
    icon: AlertOctagon,
    title: 'Object to Automated Processing',
    description: 'Request human review of any automated compilation of your data, including screening reports. You have this right under Proclamation No. 1321/2024.',
    cta: 'Object & Request Human Review',
    color: 'purple',
  },
];

const COLOR_MAP = {
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' },
  green: { bg: 'bg-green-50', icon: 'text-green-600', border: 'border-green-200' },
  red: { bg: 'bg-red-50', icon: 'text-red-600', border: 'border-red-200' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-200' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-200' },
};

const STATUS_BADGES = {
  pending: 'secondary',
  in_progress: 'outline',
  completed: 'default',
  denied: 'destructive',
  partially_fulfilled: 'outline',
};

export default function DataRights() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { type, title }
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    base44.auth.me().then(async u => {
      setUser(u);
      const reqs = await base44.entities.DataRightsRequest.filter({ user_id: u.id }, '-created_date');
      setRequests(reqs);
      setLoading(false);
    });
  }, []);

  async function handleSubmit() {
    setSubmitting(true);
    const req = await base44.entities.DataRightsRequest.create({
      user_id: user.id,
      user_name: user.full_name || user.email,
      request_type: modal.type,
      description,
      status: 'pending',
    });

    await base44.entities.AuditLog.create({
      action_type: 'data_rights_request',
      actor_id: user.id,
      actor_name: user.full_name || user.email,
      actor_role: 'tenant',
      entity_type: 'DataRightsRequest',
      entity_id: req.id,
      reason: `${modal.type}: ${description?.slice(0, 100)}`,
    });

    setRequests(r => [req, ...r]);
    setModal(null);
    setDescription('');
    setSubmitting(false);
    toast({ title: 'Request submitted. T.Bedrock will respond within 30 days.' });
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
          <ShieldCheck size={22} className="text-primary" /> Data Rights
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your rights under Ethiopia's Personal Data Protection Proclamation No. 1321/2024.
        </p>
      </div>

      <div className="grid gap-3">
        {REQUEST_TYPES.map(rt => {
          const Icon = rt.icon;
          const colors = COLOR_MAP[rt.color];
          return (
            <Card key={rt.type} className={`border ${colors.border}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colors.bg}`}>
                    <Icon size={18} className={colors.icon} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{rt.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{rt.description}</p>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => setModal(rt)}>
                    {rt.cta}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Previous requests */}
      {requests.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold font-heading">My Requests</h2>
          {requests.map(req => (
            <Card key={req.id}>
              <CardContent className="p-4 flex items-start gap-3">
                <Clock size={15} className="text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium capitalize">{req.request_type.replace(/_/g, ' ')}</span>
                    <Badge variant={STATUS_BADGES[req.status] || 'secondary'} className="capitalize text-xs">{req.status.replace(/_/g, ' ')}</Badge>
                  </div>
                  {req.description && <p className="text-xs text-muted-foreground mt-1 truncate">{req.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{new Date(req.created_date).toLocaleDateString()}</p>
                  {req.admin_notes && <p className="text-xs text-foreground mt-2 p-2 bg-secondary rounded">{req.admin_notes}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Request modal */}
      {modal && (
        <Dialog open onOpenChange={() => setModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{modal.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">{modal.description}</p>
              <div>
                <label className="text-sm font-medium">Additional details (optional)</label>
                <Textarea className="mt-1" rows={3} placeholder="Describe your request…" value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Request'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}