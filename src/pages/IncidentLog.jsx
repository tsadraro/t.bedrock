import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ShieldCheck, Plus, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';

const SEVERITY_COLORS = { low: 'secondary', medium: 'outline', high: 'default', critical: 'destructive' };
const NOTIFICATION_STATUS_LABELS = {
  not_required: 'Not Required',
  pending: 'Notification Pending',
  notified_users: 'Users Notified',
  notified_authority: 'Authority Notified',
  fully_notified: 'Fully Notified',
};

export default function IncidentLog() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    detection_time: new Date().toISOString().slice(0, 16),
    severity: 'medium',
    notification_status: 'pending',
  });

  useEffect(() => {
    base44.auth.me().then(async u => {
      setUser(u);
      const data = await base44.entities.IncidentLog.list('-detection_time');
      setIncidents(data);
      setLoading(false);
    });
  }, []);

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    const detectionTime = new Date(form.detection_time);
    const now = new Date();
    const hoursElapsed = (now - detectionTime) / 3600000;
    const incident = await base44.entities.IncidentLog.create({
      ...form,
      detection_time: detectionTime.toISOString(),
      hours_since_detection: Math.round(hoursElapsed * 10) / 10,
      within_72h_window: hoursElapsed <= 72,
      reported_by_id: user.id,
    });
    setIncidents(i => [incident, ...i]);
    setShowNew(false);
    setSaving(false);
    toast({ title: 'Incident logged' });
  }

  if (user?.role !== 'admin') return <div className="text-center py-20 text-muted-foreground">Access restricted.</div>;
  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading flex items-center gap-2"><ShieldCheck size={22} />Incident Log</h1>
          <p className="text-muted-foreground text-sm mt-1">Data breach and security incident tracking (Proclamation No. 1321/2024 — 72-hour notification requirement).</p>
        </div>
        <Button onClick={() => setShowNew(true)}><Plus size={16} className="mr-1" />Log Incident</Button>
      </div>

      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle size={16} className="text-red-600" />
        <AlertDescription className="text-red-800 text-sm">
          Under Proclamation No. 1321/2024, data breaches must be reported to the Ethiopian Communications Authority (ECA) within 72 hours of detection. The 72-hour window is tracked per incident.
        </AlertDescription>
      </Alert>

      {incidents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><ShieldCheck size={40} className="mx-auto mb-3 opacity-20" /><p>No incidents logged.</p></div>
      ) : (
        <div className="space-y-4">
          {incidents.map(inc => (
            <Card key={inc.id} className={`border ${inc.severity === 'critical' ? 'border-red-300' : inc.severity === 'high' ? 'border-amber-300' : ''}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={SEVERITY_COLORS[inc.severity]} className="capitalize">{inc.severity}</Badge>
                    <Badge variant="outline">{NOTIFICATION_STATUS_LABELS[inc.notification_status]}</Badge>
                    {inc.within_72h_window && <Badge variant="destructive" className="text-xs">⏱ Within 72h window</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(inc.detection_time).toLocaleString()}
                  </span>
                </div>

                <p className="text-sm">{inc.description}</p>

                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  {inc.affected_user_count && <span>Affected users: <strong>{inc.affected_user_count}</strong></span>}
                  {inc.hours_since_detection !== undefined && <span>Hours since detection: <strong>{inc.hours_since_detection}h</strong></span>}
                  {inc.authority_ref_number && <span>Authority ref: <strong>{inc.authority_ref_number}</strong></span>}
                </div>

                {inc.remediation_steps && (
                  <div className="text-xs bg-secondary rounded p-2"><strong>Remediation:</strong> {inc.remediation_steps}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New incident dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Log Security Incident</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Detection Time *</Label>
                <Input type="datetime-local" className="mt-1" value={form.detection_time} onChange={e => set('detection_time', e.target.value)} required />
              </div>
              <div>
                <Label>Severity *</Label>
                <Select value={form.severity} onValueChange={v => set('severity', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Description *</Label>
              <Textarea className="mt-1" rows={3} required value={form.description || ''} onChange={e => set('description', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Affected User Count</Label>
                <Input type="number" min="0" className="mt-1" value={form.affected_user_count || ''} onChange={e => set('affected_user_count', Number(e.target.value))} />
              </div>
              <div>
                <Label>Notification Status</Label>
                <Select value={form.notification_status} onValueChange={v => set('notification_status', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_required">Not Required</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="notified_users">Users Notified</SelectItem>
                    <SelectItem value="notified_authority">Authority Notified</SelectItem>
                    <SelectItem value="fully_notified">Fully Notified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Data Types Affected</Label>
              <Input className="mt-1" placeholder="e.g. identity records, lease data…" value={form.data_types_affected || ''} onChange={e => set('data_types_affected', e.target.value)} />
            </div>

            <div>
              <Label>Remediation Steps</Label>
              <Textarea className="mt-1" rows={2} value={form.remediation_steps || ''} onChange={e => set('remediation_steps', e.target.value)} />
            </div>

            <div>
              <Label>Authority Reference Number (if reported)</Label>
              <Input className="mt-1" value={form.authority_ref_number || ''} onChange={e => set('authority_ref_number', e.target.value)} />
            </div>

            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Log Incident'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}