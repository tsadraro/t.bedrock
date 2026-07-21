import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, MapPin, BedDouble, Home, ChevronRight, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STATUS_COLORS = {
  draft: 'secondary',
  active: 'default',
  rented: 'outline',
  inactive: 'destructive',
};

export default function Properties() {
  const [user, setUser] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      loadProperties(u);
    });
  }, []);

  async function loadProperties(u) {
    const isAdmin = u?.role === 'admin';
    const isLandlord = u?.extra_data?.is_landlord && !isAdmin;
    let data;
    if (isAdmin) {
      data = await base44.entities.Property.list('-created_date');
    } else if (isLandlord) {
      data = await base44.entities.Property.filter({ landlord_id: u.id }, '-created_date');
    } else {
      data = await base44.entities.Property.filter({ status: 'active' }, '-created_date');
    }
    setProperties(data);
    setLoading(false);
  }

  const isAdmin = user?.role === 'admin';
  const isLandlord = user?.extra_data?.is_landlord && !isAdmin;
  const canCreate = isLandlord || isAdmin;

  const filtered = properties.filter(p => {
    const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.address?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">
            {isLandlord ? 'My Properties' : isAdmin ? 'All Properties' : 'Available Properties'}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">{filtered.length} listing{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link to="/properties/new"><Plus size={16} className="mr-1" /> New Listing</Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search properties…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {(isAdmin || isLandlord) && (
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <Filter size={14} className="mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="rented">Rented</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Home size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No properties found</p>
          {canCreate && <Button asChild className="mt-4"><Link to="/properties/new">Create your first listing</Link></Button>}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map(property => (
            <Link key={property.id} to={`/properties/${property.id}`}>
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold font-heading truncate">{property.title}</h3>
                      <div className="flex items-center gap-1 text-muted-foreground text-sm mt-1">
                        <MapPin size={13} />
                        <span className="truncate">{property.address}{property.subcity ? `, ${property.subcity}` : ''}</span>
                      </div>
                    </div>
                    <Badge variant={STATUS_COLORS[property.status] || 'secondary'} className="shrink-0 capitalize">
                      {property.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    {property.bedrooms && <span className="flex items-center gap-1"><BedDouble size={14} />{property.bedrooms} bed</span>}
                  </div>

                  <div className="flex items-end justify-between mt-auto pt-3 border-t border-border">
                    <div>
                      <p className="text-lg font-bold font-heading">{property.rent_amount?.toLocaleString()} ETB</p>
                      <p className="text-xs text-muted-foreground">/ month · Deposit: {property.deposit_amount?.toLocaleString()} ETB</p>
                    </div>
                    <ChevronRight size={18} className="text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}