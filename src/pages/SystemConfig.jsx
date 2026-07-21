import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Settings, Save, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';

const CATEGORY_LABELS = { compliance: 'Compliance (Statutory)', legal: 'Legal', financial: 'Financial', general: 'General' };
const CATEGORY_COLORS = { compliance: 'bg-amber-50 border-amber-200', legal: 'bg-red-50 border-red-200', financial: 'bg-blue-50 border-blue-200', general: 'bg-secondary' };

export default function SystemConfig() {
  const { toast } = useToast();
  const [configs, setConfigs] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([base44.auth.me(), base44.entities.SystemConfig.list()])
      .then(([u, c]) => { setUser(u); setConfigs(c); setLoading(false); });
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  // Admin only
  if (user?.role !== 'admin') return (
    <div className="text-center py-20 text-muted-foreground">Access restricted to T.Bedrock administrators.</div>
  );

  const grouped = configs.reduce((acc, c) => {
    const cat = c.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(c);
    return acc;
  }, {});

  function setEdit(id, val) {
    setEdits(e => ({ ...e, [id]: val }));
  }

  async function handleSave() {
    setSaving(true);
    const changed = Object.entries(edits);
    for (const [id, value] of changed) {
      const cfg = configs.find(c => c.id === id);
      if (cfg && cfg.value !== value) {
        await base44.entities.SystemConfig.update(id, { value });
        await base44.entities.AuditLog.create({
          action_type: 'system_config_changed',
          actor_id: user.id,
          actor_name: user.full_name || user.email,
          actor_role: 'admin',
          entity_type: 'SystemConfig',
          entity_id: id,
          reason: `Config changed: ${cfg.key} = ${value}`,
        });
      }
    }
    const updated = await base44.entities.SystemConfig.list();
    setConfigs(updated);
    setEdits({});
    setSaving(false);
    // Bust the cached config
    window.location.reload();
    toast({ title: 'System configuration saved' });
  }

  const hasChanges = Object.keys(edits).length > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading flex items-center gap-2"><Settings size={22} /> System Configuration</h1>
          <p className="text-muted-foreground text-sm mt-1">All statutory and operational values. Changes are audit-logged.</p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={saving}>
            <Save size={16} className="mr-1" />{saving ? 'Saving…' : 'Save Changes'}
          </Button>
        )}
      </div>

      <Alert className="border-amber-200 bg-amber-50">
        <AlertTriangle size={16} className="text-amber-600" />
        <AlertDescription className="text-amber-800 text-sm">
          Statutory values (MIN_LEASE_MONTHS, MAX_ADVANCE_MONTHS, ANNUAL_RENT_INCREASE_CAP_PERCENT) reflect Ethiopian law. Update only when regulation changes and document the regulatory basis.
        </AlertDescription>
      </Alert>

      {['compliance', 'legal', 'financial', 'general'].map(cat => {
        const items = grouped[cat];
        if (!items?.length) return null;
        return (
          <Card key={cat} className={`border ${CATEGORY_COLORS[cat]}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Badge variant="outline">{CATEGORY_LABELS[cat]}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map(cfg => {
                const currentVal = edits[cfg.id] !== undefined ? edits[cfg.id] : cfg.value;
                const isDirty = edits[cfg.id] !== undefined && edits[cfg.id] !== cfg.value;
                return (
                  <div key={cfg.id} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-white px-2 py-0.5 rounded border">{cfg.key}</code>
                      {isDirty && <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">unsaved</Badge>}
                    </div>
                    {cfg.description && (
                      <p className="text-xs text-muted-foreground flex items-start gap-1">
                        <Info size={11} className="mt-0.5 shrink-0" />{cfg.description}
                      </p>
                    )}
                    <Input
                      className="bg-white font-mono text-sm"
                      value={currentVal}
                      onChange={e => setEdit(cfg.id, e.target.value)}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}