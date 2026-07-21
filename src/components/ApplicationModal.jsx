import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle } from 'lucide-react';

const CONSENT_VERSION = '1.0.0';

const CONSENT_TEXT_SCREENING = `By checking this box, you consent to T.Bedrock & Co. compiling a screening report from your identity verification status, rental history on this platform, and any landlord-submitted references, and sharing this report with the landlord of the property you are applying for. This consent is specific to this application. You may withdraw consent at any time via Data Rights settings. (Proclamation No. 1321/2024)`;

export default function ApplicationModal({ property, user, onClose, onSuccess }) {
  const [message, setMessage] = useState('');
  const [consentScreening, setConsentScreening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!consentScreening) {
      setError('You must consent to screening data sharing to apply.');
      return;
    }
    setSaving(true);
    setError('');

    const now = new Date().toISOString();

    const application = await base44.entities.Application.create({
      property_id: property.id,
      property_address: property.address,
      landlord_id: property.landlord_id,
      tenant_id: user.id,
      tenant_name: user.full_name || user.email,
      status: 'pending',
      screening_consent_granted: true,
      screening_consent_granted_at: now,
      screening_consent_version: CONSENT_VERSION,
      applicant_message: message,
    });

    // Log the specific consent with full text snapshot
    await base44.entities.ConsentLog.create({
      user_id: user.id,
      consent_type: 'screening_data_share',
      consent_granted: true,
      consent_text_version: CONSENT_VERSION,
      consent_text_snapshot: CONSENT_TEXT_SCREENING,
      landlord_id: property.landlord_id,
      application_id: application.id,
    });

    await base44.entities.AuditLog.create({
      action_type: 'application_submitted',
      actor_id: user.id,
      actor_name: user.full_name || user.email,
      actor_role: 'tenant',
      entity_type: 'Application',
      entity_id: application.id,
      reason: `Applied to: ${property.title}`,
    });

    onSuccess();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply — {property.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Rent:</span> {property.rent_amount?.toLocaleString()} ETB/month ·{' '}
            <span className="font-medium">Deposit:</span> {property.deposit_amount?.toLocaleString()} ETB
          </div>

          <div>
            <Label>Message to Landlord (optional)</Label>
            <Textarea className="mt-1" rows={3} placeholder="Introduce yourself…" value={message} onChange={e => setMessage(e.target.value)} />
          </div>

          {/* Screening consent — separate checkbox, not bundled (Proclamation No. 1321/2024) */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle size={15} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs font-semibold text-foreground">Screening Data Consent (required)</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{CONSENT_TEXT_SCREENING}</p>
            <div className="flex items-center gap-2">
              <Checkbox id="consent-screening" checked={consentScreening} onCheckedChange={setConsentScreening} />
              <label htmlFor="consent-screening" className="text-sm font-medium cursor-pointer">
                I consent to screening data sharing for this application
              </label>
            </div>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving || !consentScreening}>
              {saving ? 'Submitting…' : 'Submit Application'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}