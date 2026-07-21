import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { MapPin, BedDouble, Bath, Ruler, Calendar, ShieldCheck, AlertTriangle, ArrowLeft, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import ApplicationModal from '@/components/ApplicationModal';

const STATUS_COLORS = { draft: 'secondary', active: 'default', rented: 'outline', inactive: 'destructive' };

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [property, setProperty] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);

  useEffect(() => {
    Promise.all([base44.entities.Property.get(id), base44.auth.me()])
      .then(([p, u]) => { setProperty(p); setUser(u); })
      .finally(() => setLoading(false));
  }, [id]);

  const isAdmin = user?.role === 'admin';
  const isLandlord = user?.extra_data?.is_landlord && !isAdmin;
  const isOwner = isLandlord && property?.landlord_id === user?.id;
  const isTenant = !isAdmin && !isLandlord;

  async function handlePublish() {
    await base44.entities.Property.update(id, { status: 'active' });
    setProperty(p => ({ ...p, status: 'active' }));
    toast({ title: 'Property published' });
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (!property) return <div className="text-center py-20 text-muted-foreground">Property not found</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft size={18} /></Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold font-heading truncate">{property.title}</h1>
        </div>
        <Badge variant={STATUS_COLORS[property.status]} className="capitalize">{property.status}</Badge>
      </div>

      {/* Address & quick info */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start gap-2 text-muted-foreground">
            <MapPin size={16} className="mt-0.5 shrink-0" />
            <span className="text-sm">{property.address}{property.subcity ? `, ${property.subcity}` : ''}{property.woreda ? `, ${property.woreda}` : ''}</span>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            {property.bedrooms && <span className="flex items-center gap-1.5 text-muted-foreground"><BedDouble size={15} />{property.bedrooms} Bedrooms</span>}
            {property.bathrooms && <span className="flex items-center gap-1.5 text-muted-foreground"><Bath size={15} />{property.bathrooms} Bathrooms</span>}
            {property.size_sqm && <span className="flex items-center gap-1.5 text-muted-foreground"><Ruler size={15} />{property.size_sqm} m²</span>}
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Monthly Rent</p>
              <p className="text-xl font-bold font-heading">{property.rent_amount?.toLocaleString()} ETB</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Security Deposit</p>
              <p className="text-xl font-bold font-heading">{property.deposit_amount?.toLocaleString()} ETB</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-muted-foreground" />
              <span>Min. lease: <strong>{property.minimum_lease_months} months</strong></span>
            </div>
            {property.advance_months_requested > 0 && (
              <div className="flex items-center gap-2">
                <span>Advance: <strong>{property.advance_months_requested} month{property.advance_months_requested > 1 ? 's' : ''}</strong></span>
              </div>
            )}
          </div>

          {property.lease_term_exception_flagged && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-amber-900">Lease term exception flagged</p>
                <p className="text-xs text-amber-700 mt-0.5">{property.lease_term_exception_reason}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compliance compliance note */}
      <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-200 text-xs text-green-800">
        <ShieldCheck size={14} className="text-green-600 mt-0.5 shrink-0" />
        <span>Deposit and advance payment comply with Proclamation No. 1320/2024 limits. All rent payments routed through licensed payment rails only.</span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {isTenant && property.status === 'active' && (
          <Button onClick={() => setShowApply(true)}>Apply for this Property</Button>
        )}
        {isOwner && (
          <>
            <Button variant="outline" asChild><Link to={`/properties/${id}/edit`}><Edit size={15} className="mr-1" />Edit</Link></Button>
            {property.status === 'draft' && (
              <Button onClick={handlePublish}>Publish Listing</Button>
            )}
          </>
        )}
        {isAdmin && (
          <Button variant="outline" asChild><Link to={`/properties/${id}/edit`}>Edit (Admin)</Link></Button>
        )}
      </div>

      {showApply && (
        <ApplicationModal
          property={property}
          user={user}
          onClose={() => setShowApply(false)}
          onSuccess={() => { setShowApply(false); toast({ title: 'Application submitted!' }); }}
        />
      )}
    </div>
  );
}