import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { verifyFaydaId } from '@/lib/config';
import { ShieldCheck, AlertTriangle, Info, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';

const CONSENT_VERSION = '1.0.0';

const CONSENT_TEXT_IDENTITY = `I consent to T.Bedrock & Co. collecting and processing my identity and financial data (including national ID, income information, and payment records) for the purpose of tenant screening and rental escrow management on this platform. (Proclamation No. 1321/2024)`;
const CONSENT_TEXT_HISTORY = `I consent to T.Bedrock & Co. storing my rental history (payment punctuality, disputes, damage claims) as a portable record that may be shared with future landlords when I apply for properties, subject to my consent at each application. (Proclamation No. 1321/2024)`;

const FAYDA_STATUS_CONFIG = {
  not_submitted: { label: 'Not Submitted', icon: AlertTriangle, color: 'text-muted-foreground', badge: 'secondary' },
  pending: { label: 'Verification Pending', icon: Clock, color: 'text-amber-600', badge: 'outline' },
  verified: { label: 'Verified', icon: CheckCircle, color: 'text-green-600', badge: 'default' },
  rejected: { label: 'Verification Failed', icon: XCircle, color: 'text-destructive', badge: 'destructive' },
};

export default function TenantProfile() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    base44.auth.me().then(async u => {
      setUser(u);
      const profiles = await base44.entities.TenantProfile.filter({ user_id: u.id });
      if (profiles.length > 0) {
        setProfile(profiles[0]);
        setForm(profiles[0]);
      } else {
        setForm({ user_id: u.id, full_name: u.full_name || '', national_id_type: 'fayda' });
      }
      setLoading(false);
    });
  }, []);

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    const now = new Date().toISOString();
    const data = { ...form, user_id: user.id };

    // Log consent changes
    if (form.consent_identity_financial && (!profile?.consent_identity_financial)) {
      data.consent_identity_financial_timestamp = now;
      data.consent_identity_financial_version = CONSENT_VERSION;
      await base44.entities.ConsentLog.create({
        user_id: user.id,
        consent_type: 'identity_financial_data',
        consent_granted: true,
        consent_text_version: CONSENT_VERSION,
        consent_text_snapshot: CONSENT_TEXT_IDENTITY,
      });
    }
    if (form.consent_rental_history_portability && (!profile?.consent_rental_history_portability)) {
      data.consent_rental_history_timestamp = now;
      data.consent_rental_history_version = CONSENT_VERSION;
      await base44.entities.ConsentLog.create({
        user_id: user.id,
        consent_type: 'rental_history_portability',
        consent_granted: true,
        consent_text_version: CONSENT_VERSION,
        consent_text_snapshot: CONSENT_TEXT_HISTORY,
      });
    }

    if (profile) {
      const updated = await base44.entities.TenantProfile.update(profile.id, data);
      setProfile(updated);
    } else {
      const created = await base44.entities.TenantProfile.create(data);
      setProfile(created);
    }
    toast({ title: 'Profile saved' });
    setSaving(false);
  }

  async function handleVerifyFayda() {
    if (!form.fayda_id) { toast({ title: 'Enter your Fayda ID first', variant: 'destructive' }); return; }
    setVerifying(true);
    const result = await verifyFaydaId(form.fayda_id, form);
    const now = new Date().toISOString();
    const updates = { fayda_verification_status: result.status, fayda_verification_timestamp: now };
    if (profile) {
      const updated = await base44.entities.TenantProfile.update(profile.id, updates);
      setProfile(updated);
      setForm(f => ({ ...f, ...updates }));
    }
    toast({ title: `Fayda ID: ${result.message}` });
    setVerifying(false);
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  const faydaStatus = FAYDA_STATUS_CONFIG[form.fayda_verification_status || 'not_submitted'];
  const FaydaIcon = faydaStatus.icon;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">My Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Your verified identity is your portable rental passport on T.Bedrock.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Identity */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck size={16} />Identity Verification</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-blue-200 bg-blue-50">
              <Info size={14} className="text-blue-600" />
              <AlertDescription className="text-xs text-blue-800">
                Your Fayda National Digital ID is the primary identifier on this platform. Fayda API integration is pending — verification will be processed once active.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>ID Type</Label>
                <Select value={form.national_id_type || 'fayda'} onValueChange={v => set('national_id_type', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fayda">Fayda National ID</SelectItem>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="kebele_id">Kebele ID</SelectItem>
                    <SelectItem value="drivers_license">Driver's License</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fayda ID Number</Label>
                <Input className="mt-1" placeholder="FYD-XXXXXXXXXX" value={form.fayda_id || ''} onChange={e => set('fayda_id', e.target.value)} />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
              <div className="flex items-center gap-2">
                <FaydaIcon size={15} className={faydaStatus.color} />
                <span className="text-sm font-medium">Status:</span>
                <Badge variant={faydaStatus.badge}>{faydaStatus.label}</Badge>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleVerifyFayda} disabled={verifying}>
                {verifying ? 'Checking…' : 'Submit for Verification'}
              </Button>
            </div>
            {form.fayda_verification_status === 'pending' && (
              <p className="text-xs text-muted-foreground italic">⚠ Stub mode: real Fayda API not yet connected. This returns "pending" for all requests.</p>
            )}
          </CardContent>
        </Card>

        {/* Personal info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Full Name *</Label>
                <Input className="mt-1" value={form.full_name || ''} onChange={e => set('full_name', e.target.value)} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input className="mt-1" placeholder="+251…" value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date of Birth</Label>
                <Input type="date" className="mt-1" value={form.date_of_birth || ''} onChange={e => set('date_of_birth', e.target.value)} />
              </div>
              <div>
                <Label>Gender</Label>
                <Select value={form.gender || ''} onValueChange={v => set('gender', v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Occupation</Label>
                <Input className="mt-1" value={form.occupation || ''} onChange={e => set('occupation', e.target.value)} />
              </div>
              <div>
                <Label>Employer</Label>
                <Input className="mt-1" value={form.employer || ''} onChange={e => set('employer', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Monthly Income (ETB)</Label>
              <Input type="number" min="0" className="mt-1 w-48" value={form.monthly_income || ''} onChange={e => set('monthly_income', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Consent section — separate checkboxes per Proclamation No. 1321/2024 */}
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck size={16} className="text-blue-600" />
              Data Consent (Proclamation No. 1321/2024)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-xs text-muted-foreground">Each consent below is separate and independent. You can withdraw any consent at any time via your Data Rights settings.</p>

            {/* Consent 1: Identity & financial data */}
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="consent-identity"
                  checked={!!form.consent_identity_financial}
                  onCheckedChange={v => set('consent_identity_financial', v)}
                />
                <div>
                  <label htmlFor="consent-identity" className="text-sm font-medium cursor-pointer">
                    Consent 1 of 3: Identity & Financial Data Collection
                  </label>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{CONSENT_TEXT_IDENTITY}</p>
                  {form.consent_identity_financial_timestamp && (
                    <p className="text-xs text-green-600 mt-1">✓ Consented {new Date(form.consent_identity_financial_timestamp).toLocaleDateString()} · v{form.consent_identity_financial_version}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Consent 2: Rental history portability */}
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="consent-history"
                  checked={!!form.consent_rental_history_portability}
                  onCheckedChange={v => set('consent_rental_history_portability', v)}
                />
                <div>
                  <label htmlFor="consent-history" className="text-sm font-medium cursor-pointer">
                    Consent 2 of 3: Rental History Portability
                  </label>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{CONSENT_TEXT_HISTORY}</p>
                  {form.consent_rental_history_timestamp && (
                    <p className="text-xs text-green-600 mt-1">✓ Consented {new Date(form.consent_rental_history_timestamp).toLocaleDateString()} · v{form.consent_rental_history_version}</p>
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Consent 3 of 3 (screening data sharing with a specific landlord) is captured at each application — not here.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Profile'}</Button>
        </div>
      </form>
    </div>
  );
}