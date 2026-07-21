import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Users as UsersIcon, Mail, Shield, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

export default function Users() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    base44.auth.me().then(async u => {
      setUser(u);
      const all = await base44.entities.User.list();
      setUsers(all);
      setLoading(false);
    });
  }, []);

  async function handleInvite(e) {
    e.preventDefault();
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail, inviteRole);
      toast({ title: `Invitation sent to ${inviteEmail}` });
      setShowInvite(false);
      setInviteEmail('');
    } catch (err) {
      toast({ title: 'Failed to invite user', description: err.message, variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  }

  if (user?.role !== 'admin') return <div className="text-center py-20 text-muted-foreground">Access restricted to admins.</div>;
  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
            <UsersIcon size={22} />Platform Users
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{users.length} registered user{users.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setShowInvite(true)}>
          <Mail size={15} className="mr-1" />Invite User
        </Button>
      </div>

      <div className="space-y-2">
        {users.map(u => (
          <Card key={u.id}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <UserCheck size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{u.full_name || '—'}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {u.extra_data?.is_landlord && (
                  <Badge variant="outline" className="text-xs">Landlord</Badge>
                )}
                <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="text-xs capitalize flex items-center gap-1">
                  {u.role === 'admin' && <Shield size={10} />}
                  {u.role}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Invite User</DialogTitle></DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Email address</label>
              <Input className="mt-1" type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@example.com" />
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User (Tenant / Landlord)</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
              <Button type="submit" disabled={inviting}>{inviting ? 'Sending…' : 'Send Invite'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}