import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../hooks/useAuth';
import { useClubs, useAllClubs, useActivity } from '../hooks/useClubs';
import type { Club } from '../hooks/useClubs';

const createSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Max 50 characters'),
  description: z.string().max(200, 'Max 200 characters').optional(),
});

type CreateForm = z.infer<typeof createSchema>;

const CARD_GRADIENTS = [
  'from-orange-400 to-orange-600',
  'from-red-400 to-red-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-red-500',
  'from-blue-400 to-blue-600',
  'from-emerald-400 to-green-600',
  'from-violet-400 to-purple-600',
  'from-teal-400 to-teal-600',
];

function clubGradient(id: string) {
  return CARD_GRADIENTS[id.charCodeAt(id.length - 1) % CARD_GRADIENTS.length];
}

function clubInitials(name: string) {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 5) return `${weeks}w ago`;
  return `${months}mo ago`;
}

export default function ClubsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { clubs, isLoading, error, createClub } = useClubs();
  const { clubs: allClubs, isLoading: allLoading } = useAllClubs();
  const { events: activityItems } = useActivity();
  const discoverClubs = allClubs.filter(c => !clubs.some(mc => mc._id === c._id));
  const [showAll, setShowAll] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  });

  const ownedCount = clubs.filter(c => c.creatorId === user?.id).length;
  const totalMembers = clubs.reduce((sum, c) => sum + c.memberIds.length, 0);
  const joinedCount = clubs.filter(c => c.creatorId !== user?.id).length;


  async function onSubmit(data: CreateForm) {
    setCreating(true);
    setCreateError(null);
    try {
      const club = await createClub(data.name, data.description ?? '');
      reset();
      setShowForm(false);
      navigate(`/clubs/${club._id}`);
    } catch {
      setCreateError('Failed to create club. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex min-h-svh bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-col bg-orange-500 text-white shrink-0">
        <div className="px-6 py-8">
          <p className="text-2xl font-black tracking-tight">PaceTrack</p>
          <p className="mt-0.5 text-xs text-orange-200">Run. Track. Improve.</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          <NavItem label="Overview" icon={<GridIcon />} onClick={() => navigate('/dashboard')} />
          <NavItem label="Activities" icon={<ActivityIcon />} onClick={() => navigate('/runs')} />
          <NavItem label="Clubs" icon={<ClubsIcon />} active onClick={() => {}} />
          <NavItem label="Track Run" icon={<PinIcon />} onClick={() => navigate('/track')} />
        </nav>
        <div className="p-4 border-t border-orange-400">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-orange-400 flex items-center justify-center text-sm font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{user?.firstName} {user?.lastName}</p>
              <button
                onClick={() => { logout(); navigate('/login', { replace: true }); }}
                className="text-xs text-orange-200 hover:text-white"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between bg-orange-500 px-4 py-4 text-white">
          <button onClick={() => navigate('/dashboard')} className="text-lg font-black tracking-tight">PaceTrack</button>
          <button onClick={() => navigate('/track')} className="flex items-center gap-1.5 rounded-full bg-white text-red-500 px-4 py-1.5 text-sm font-bold shadow-sm">
            🏃 Start Run
          </button>
        </header>

        <main className="flex-1 p-6 max-w-4xl w-full mx-auto">

          {/* Breadcrumb + CTA */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-1.5 text-sm text-gray-400">
              <button onClick={() => navigate('/dashboard')} className="hover:text-orange-500 transition">← Dashboard</button>
              <span>/</span>
              <span className="font-semibold text-gray-900">Clubs</span>
            </div>
            <button
              onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-red-500 to-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-200 hover:shadow-red-300 hover:scale-[1.03] active:scale-[0.97] transition-all duration-150"
            >
              {showForm ? '✕ Cancel' : '👥 New Club'}
            </button>
          </div>

          {/* Create form */}
          {showForm && (
            <div className="mb-6 rounded-2xl bg-white border border-orange-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-lg">👥</div>
                <p className="font-semibold text-gray-900">Create a new club</p>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Club name</label>
                  <input
                    {...register('name')}
                    placeholder="e.g. Morning Runners"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                  <textarea
                    {...register('description')}
                    rows={2}
                    placeholder="What's this club about?"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 resize-none"
                  />
                  {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
                </div>
                {createError && <p className="text-sm text-red-500">{createError}</p>}
                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={creating}
                    className="flex items-center gap-2 rounded-full bg-gradient-to-r from-red-500 to-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-red-200 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:scale-100">
                    {creating ? 'Creating…' : '👥 Create Club'}
                  </button>
                  <button type="button" onClick={() => { reset(); setShowForm(false); setCreateError(null); }}
                    className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 transition">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Stats row */}
          {!isLoading && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              <StatCard value={ownedCount} label="Club owner" />
              <StatCard value={totalMembers} label="Members" sub="Across all clubs" icon="👥" />
              <StatCard value={joinedCount} label="Clubs joined" />
            </div>
          )}
          {isLoading && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-gray-200 animate-pulse" />)}
            </div>
          )}

          {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 mb-6">{error}</div>}

          {/* MY CLUBS */}
          {!isLoading && clubs.length > 0 && (
            <section className="mb-8">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">My Clubs</p>
              <div className="space-y-3">
                {clubs.map(club => (
                  <MyClubCard key={club._id} club={club} isOwner={club.creatorId === user?.id} onClick={() => navigate(`/clubs/${club._id}`)} />
                ))}
              </div>
            </section>
          )}

          {/* RECENT ACTIVITY */}
          {activityItems.length > 0 && (
            <section className="mb-8">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">Recent Activity</p>
              <div className="rounded-2xl bg-white border border-gray-100 divide-y divide-gray-50">
                {activityItems.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(`/clubs/${item.clubId}`)}
                    className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition text-left"
                  >
                    <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                    <p className="text-sm text-gray-700 flex-1">
                      <span className="font-semibold">
                        {item.isCurrentUser ? 'You' : item.firstName}
                      </span>
                      {' '}{item.type === 'created' ? `created ${item.clubName}` : `joined ${item.clubName}`}
                    </p>
                    <span className="text-xs text-gray-400 shrink-0">{timeAgo(item.date)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* DISCOVER CLUBS */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Discover Clubs</p>
              {discoverClubs.length > 4 && (
                <button onClick={() => setShowAll(v => !v)} className="text-sm font-semibold text-orange-500 hover:text-orange-600 transition">
                  {showAll ? 'Show less' : 'Browse all'}
                </button>
              )}
            </div>

            {allLoading ? (
              <div className="grid grid-cols-2 gap-4">
                {[1,2,3,4].map(i => <div key={i} className="h-44 rounded-2xl bg-gray-200 animate-pulse" />)}
              </div>
            ) : discoverClubs.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {(showAll ? discoverClubs : discoverClubs.slice(0, 4)).map(club => (
                  <DiscoverCard key={club._id} club={club} onClick={() => navigate(`/clubs/${club._id}`)} />
                ))}
              </div>
            ) : !isLoading && (
              clubs.length > 0
                ? <p className="py-6 text-center text-sm text-gray-400">No other clubs to join right now.</p>
                : (
                  <div className="py-12 text-center">
                    <div className="flex justify-center gap-1 text-4xl mb-4">
                      <span>🏃</span><span className="opacity-60 -ml-2 mt-2 text-3xl">🏃</span><span className="opacity-30 -ml-2 mt-4 text-2xl">🏃</span>
                    </div>
                    <p className="font-semibold text-gray-900">No clubs yet</p>
                    <p className="mt-1 text-sm text-gray-400">Be the first — create one and invite your crew.</p>
                    <button onClick={() => setShowForm(true)}
                      className="mt-5 flex items-center gap-2 mx-auto rounded-full bg-gradient-to-r from-red-500 to-red-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 hover:scale-[1.03] active:scale-[0.97] transition-all duration-150">
                      👥 Create a club
                    </button>
                  </div>
                )
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ value, label, sub, icon }: { value: number; label: string; sub?: string; icon?: string }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
      {icon && <div className="text-orange-500 mb-2 text-lg">{icon}</div>}
      {sub && !icon && <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">{sub}</p>}
      <p className="text-3xl font-black text-gray-900">{value}</p>
      <p className="text-sm font-medium text-gray-500 mt-1">{label}</p>
      {sub && icon && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function MyClubCard({ club, isOwner, onClick }: { club: Club; isOwner: boolean; onClick: () => void }) {
  const gradient = clubGradient(club._id);
  const initials = clubInitials(club.name);
  return (
    <button onClick={onClick}
      className="group w-full text-left rounded-2xl bg-white border border-gray-100 p-5 hover:border-orange-200 hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-black text-lg shrink-0 shadow-sm`}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-bold text-gray-900 truncate">{club.name}</p>
            {isOwner && <span className="shrink-0 rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-xs font-semibold text-orange-600">Owner</span>}
          </div>
          <p className="mt-0.5 text-sm text-gray-500 truncate">{club.description || 'No description'}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-gray-400">👥 {club.memberIds.length} {club.memberIds.length === 1 ? 'member' : 'members'}</span>
            <span className="rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-xs font-medium text-green-600">Active</span>
          </div>
        </div>
        <span className="text-gray-300 group-hover:text-orange-400 text-lg shrink-0 transition-colors">→</span>
      </div>
    </button>
  );
}

function DiscoverCard({ club, onClick }: { club: Club; onClick: () => void }) {
  const gradient = clubGradient(club._id);
  const initials = clubInitials(club.name);
  return (
    <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm flex flex-col">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-black text-lg mb-3 shadow-sm`}>
        {initials}
      </div>
      <p className="font-bold text-gray-900 truncate">{club.name}</p>
      <p className="text-xs text-gray-400 mt-0.5 truncate">
        {club.memberIds.length} {club.memberIds.length === 1 ? 'member' : 'members'}
        {club.description ? ` · ${club.description}` : ''}
      </p>
      <button onClick={onClick}
        className="mt-4 w-full rounded-xl border-2 border-gray-200 py-2 text-sm font-semibold text-gray-600 hover:border-orange-400 hover:text-orange-500 transition-all">
        + Join
      </button>
    </div>
  );
}

function NavItem({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
        active ? 'bg-white/20 text-white' : 'text-orange-100 hover:bg-white/10 hover:text-white'
      }`}>
      {icon}
      {label}
    </button>
  );
}

// ── Sidebar icons ─────────────────────────────────────────────────────────────

function GridIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  );
}

function ClubsIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function PinIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}
