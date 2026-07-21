import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';

export default function PropertyNew() {
  const { config, loading: configLoading } = useSystemConfig();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    title: '',
    address: '',
    subcity: '',
    woreda: '',
    rent_amount: '',
    deposit_amount: '',
    advance_months_requested: '',
    minimum_lease_months: '',
    lease_term_exception_flagged: false,
    lease_term_exception_reason: '',
    bedrooms: '',
    bathrooms: '',
    size_sqm: '',
    status: 'draft',
  });

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (!configLoading) {
        setForm(f => ({ ...f, minimum_lease_months: config.MIN_LEASE_MONTHS }));
      }
    });
  }, [configLoading]);

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: undefined }));
  }

  function validate() {
    const e = {};
    if (!form.title) e.title = 'Required';
    if (!form.address) e.address = 'Required';
    if (!form.rent_amount || isNaN(form.rent_amount) || Number(form.rent_amount) <= 0) e.rent_amount = 'Enter a valid rent amount';
    if (!form.deposit_amount || isNaN(form.deposit_amount) || Number(form.deposit_amount) <= 0) e.deposit_amount = 'Enter a valid deposit amount';

    const rentAmt = Number(form.rent_amount);
    const depositAmt = Number(form.deposit_amount);
    const advanceMonths = Number(form.advance_months_requested);
    const leaseMonths = Number(form.minimum_lease_months);

    // Compliance: max advance = MAX_ADVANCE_MONTHS months' rent
    if (form.advance_months_requested && advanceMonths > config.MAX_ADVANCE_MONTHS) {
      e.advance_months_requested = `Advance cannot exceed ${config.MAX_ADVANCE_MONTHS} months' rent (Proclamation No. 1320/2024).`;
    }
    // Compliance: deposit cannot exceed MAX_ADVANCE_MONTHS months' rent
    if (rentAmt && depositAmt && depositAmt > rentAmt * config.MAX_ADVANCE_MONTHS) {
      e.deposit_amount = `Deposit cannot exceed ${config.MAX_ADVANCE_MONTHS} months' rent (${(rentAmt * config.MAX_ADVANCE_MONTHS).toLocaleString()} ETB) per Proclamation No. 1320/2024.`;
    }
    // Compliance: minimum lease term
    if (!form.lease_term_exception_flagged && leaseMonths < config.MIN_LEASE_MONTHS) {
      e.minimum_lease_months = `Minimum lease term is ${config.MIN_LEASE_MONTHS} months per Proclamation No. 1320/2024. Flag an exception if legally justified.`;
    }
    if (form.lease_term_exception_flagged && !form.lease_term_exception_reason) {
      e.lease_term_exception_reason = 'Provide a reason for the lease term exception.';
    }

    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    const data = {
      ...form,
      rent_amount: Number(form.rent_amount),
      deposit_amount: Number(form.deposit_amount),
      advance_months_requested: form.advance_months_requested ? Number(form.advance_months_requested) : undefined,
      minimum_lease_months: Number(form.minimum_lease_months),
      bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
      bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
      size_sqm: form.size_sqm ? Number(form.size_sqm) : undefined,
      landlord_id: user.id,
      landlord_name: user.full_name || user.email,
    };

    const property = await base44.entities.Property.create(data);
    await base44.entities.AuditLog.create({
      action_type: 'property_listed',
      actor_id: user.id,
      actor_name: user.full_name || user.email,
      actor_role: 'landlord',
      entity_type: 'Property',
      entity_id: property.id,
      reason: `Property listed: ${form.title}`,
    });

    toast({ title: 'Property listed successfully' });
    navigate(`/properties/${property.id}`);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">New Property Listing</h1>
        <p className="text-muted-foreground text-sm mt-1">All fields are validated against Ethiopian rental law.</p>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <Info size={16} className="text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm">
          Compliance enforced: minimum {config.MIN_LEASE_MONTHS}-month lease, maximum {config.MAX_ADVANCE_MONTHS} months advance payment (Proclamation No. 1320/2024).
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardHeader><CardTitle className="text-base">Property Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Listing Title *</Label>
              <Input className="mt-1" placeholder="e.g. 2BR Apartment in Bole" value={form.title} onChange={e => set('title', e.target.value)} />
              {errors.title && <p className="text-destructive text-xs mt-1">{errors.title}</p>}
            </div>
            <div>
              <Label>Full Address *</Label>
              <Textarea className="mt-1" placeholder="Street, building, kebele…" value={form.address} onChange={e => set('address', e.target.value)} rows={2} />
              {errors.address && <p className="text-destructive text-xs mt-1">{errors.address}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Subcity</Label>
                <Input className="mt-1" placeholder="e.g. Bole" value={form.subcity} onChange={e => set('subcity', e.target.value)} />
              </div>
              <div>
                <Label>Woreda</Label>
                <Input className="mt-1" placeholder="e.g. Woreda 3" value={form.woreda} onChange={e => set('woreda', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Bedrooms</Label>
                <Input type="number" min="0" className="mt-1" value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)} />
              </div>
              <div>
                <Label>Bathrooms</Label>
                <Input type="number" min="0" className="mt-1" value={form.bathrooms} onChange={e => set('bathrooms', e.target.value)} />
              </div>
              <div>
                <Label>Size (m²)</Label>
                <Input type="number" min="0" className="mt-1" value={form.size_sqm} onChange={e => set('size_sqm', e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Financial Terms</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Monthly Rent (ETB) *</Label>
                <Input type="number" min="0" className="mt-1" value={form.rent_amount} onChange={e => set('rent_amount', e.target.value)} />
                {errors.rent_amount && <p className="text-destructive text-xs mt-1">{errors.rent_amount}</p>}
              </div>
              <div>
                <Label>Deposit Amount (ETB) *</Label>
                <Input type="number" min="0" className="mt-1" value={form.deposit_amount} onChange={e => set('deposit_amount', e.target.value)} />
                {errors.deposit_amount && <p className="text-destructive text-xs mt-1">{errors.deposit_amount}</p>}
                {form.rent_amount && (
                  <p className="text-xs text-muted-foreground mt-1">Max allowed: {(Number(form.rent_amount) * config.MAX_ADVANCE_MONTHS).toLocaleString()} ETB</p>
                )}
              </div>
            </div>
            <div>
              <Label>Advance Months Requested</Label>
              <Input type="number" min="0" max={config.MAX_ADVANCE_MONTHS} className="mt-1 w-32"
                value={form.advance_months_requested} onChange={e => set('advance_months_requested', e.target.value)} />
              {errors.advance_months_requested && <p className="text-destructive text-xs mt-1">{errors.advance_months_requested}</p>}
              <p className="text-xs text-muted-foreground mt-1">Maximum: {config.MAX_ADVANCE_MONTHS} months per law.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Lease Term</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Minimum Lease Term (months) *</Label>
              <Input type="number" min="1" className="mt-1 w-32"
                value={form.minimum_lease_months} onChange={e => set('minimum_lease_months', e.target.value)} />
              {errors.minimum_lease_months && <p className="text-destructive text-xs mt-1">{errors.minimum_lease_months}</p>}
              <p className="text-xs text-muted-foreground mt-1">Statutory minimum: {config.MIN_LEASE_MONTHS} months.</p>
            </div>

            <div className="flex items-center gap-3 p-4 border rounded-lg bg-amber-50 border-amber-200">
              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900">Exception to 24-month minimum?</p>
                <p className="text-xs text-amber-700 mt-0.5">Only flag if legally justified. This will be logged and visible to admins.</p>
              </div>
              <Switch checked={form.lease_term_exception_flagged} onCheckedChange={v => set('lease_term_exception_flagged', v)} />
            </div>

            {form.lease_term_exception_flagged && (
              <div>
                <Label>Exception Reason (required) *</Label>
                <Textarea className="mt-1" placeholder="State the legal basis for the shorter lease term…"
                  value={form.lease_term_exception_reason} onChange={e => set('lease_term_exception_reason', e.target.value)} rows={2} />
                {errors.lease_term_exception_reason && <p className="text-destructive text-xs mt-1">{errors.lease_term_exception_reason}</p>}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate('/properties')}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Create Listing'}</Button>
        </div>
      </form>
    </div>
  );
}