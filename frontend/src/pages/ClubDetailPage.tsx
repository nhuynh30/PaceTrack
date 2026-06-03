import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useClub, useLeaderboard } from '../hooks/useClubs';
import type { LeaderboardRow } from '../hooks/useClubs';
import { api } from '../lib/api';

const BANNER_GRADIENTS = [
  'from-orange-500 to-orange-600',
  'from-red-500 to-orange-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-red-500',
];

function bannerGradient(id: string) {
  return BANNER_GRADIENTS[id.charCodeAt(id.length - 1) % BANNER_GRADIENTS.length];
}

function clubInitials(name: string) {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export default function ClubDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { club, isLoading, error, refresh: refreshClub } = useClub(id!);
  const isCreator = club ? club.creatorId === user?.id : false;
  const isMember = club ? club.memberIds.includes(user?.id ?? '') : false;
  const { rows, isLoading: lbLoading, error: lbError, refresh: refreshLb } = useLeaderboard(id!, isMember);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleJoin() {
    setActionLoading(true);
    setActionError(null);
    try {
      await api.post(`/clubs/${id}/join`);
      refreshClub();
      refreshLb();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setActionError(msg ?? 'Failed to join club.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleLeave() {
    setActionLoading(true);
    setActionError(null);
    try {
      await api.delete(`/clubs/${id}/leave`);
      navigate('/clubs');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setActionError(msg ?? 'Failed to leave club.');
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    setActionLoading(true);
    setActionError(null);
    try {
      await api.delete(`/clubs/${id}`);
      navigate('/clubs');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setActionError(msg ?? 'Failed to delete club.');
      setActionLoading(false);
      setConfirmDelete(false);
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
          <NavItem label="Clubs" icon={<ClubsIcon />} active onClick={() => navigate('/clubs')} />
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
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between bg-orange-500 px-4 py-4 text-white">
          <button onClick={() => navigate('/clubs')} className="text-lg font-black tracking-tight">
            PaceTrack
          </button>
          <button
            onClick={() => navigate('/track')}
            className="flex items-center gap-1.5 rounded-full bg-white text-red-500 px-4 py-1.5 text-sm font-bold shadow-sm"
          >
            🏃 Start Run
          </button>
        </header>

        <main className="flex-1 p-6 max-w-3xl w-full mx-auto">
          <button onClick={() => navigate('/clubs')} className="text-sm text-gray-400 hover:text-orange-500 mb-4 block">
            ← Clubs
          </button>

          {/* Loading skeleton */}
          {isLoading && (
            <div className="space-y-4">
              <div className="h-44 rounded-2xl bg-gray-200 animate-pulse" />
              <div className="h-64 rounded-2xl bg-gray-200 animate-pulse" />
            </div>
          )}

          {/* Error */}
          {error && !isLoading && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Club detail */}
          {club && !isLoading && (
            <>
              {/* Hero banner */}
              <div className={`mb-5 rounded-2xl bg-gradient-to-br ${bannerGradient(club._id)} p-6 text-white shadow-lg`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-black shrink-0">
                      {clubInitials(club.name)}
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-xl font-black truncate">{club.name}</h1>
                      {club.description && (
                        <p className="mt-0.5 text-sm text-white/80">{club.description}</p>
                      )}
                      <p className="mt-1.5 text-xs text-white/60">
                        👥 {club.memberIds.length} {club.memberIds.length === 1 ? 'member' : 'members'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    {!isMember && (
                      <button
                        onClick={handleJoin}
                        disabled={actionLoading}
                        className="rounded-full bg-white text-orange-600 px-4 py-1.5 text-xs font-bold shadow hover:bg-orange-50 transition disabled:opacity-50"
                      >
                        {actionLoading ? 'Joining…' : '👥 Join Club'}
                      </button>
                    )}
                    {isMember && !isCreator && (
                      <button
                        onClick={handleLeave}
                        disabled={actionLoading}
                        className="rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition disabled:opacity-50"
                      >
                        {actionLoading ? 'Leaving…' : 'Leave'}
                      </button>
                    )}
                    {isCreator && !confirmDelete && (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-500/40 transition"
                      >
                        Delete Club
                      </button>
                    )}
                    {isCreator && confirmDelete && (
                      <div className="flex flex-col items-end gap-1.5">
                        <p className="text-xs text-white/80">Are you sure?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={handleDelete}
                            disabled={actionLoading}
                            className="rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white hover:bg-red-600 transition disabled:opacity-50"
                          >
                            {actionLoading ? '…' : 'Yes, delete'}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(false)}
                            className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {actionError && (
                  <p className="mt-3 text-xs text-red-200 bg-red-500/20 rounded-lg px-3 py-2">{actionError}</p>
                )}
              </div>

              {/* Weekly leaderboard */}
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                  <div>
                    <p className="font-semibold text-gray-900">This Week's Leaderboard</p>
                    <p className="text-xs text-gray-400 mt-0.5">Mon – Sun · resets weekly</p>
                  </div>
                  <button
                    onClick={refreshLb}
                    className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:border-orange-300 hover:text-orange-500 transition"
                  >
                    ↻ Refresh
                  </button>
                </div>

                {lbLoading && (
                  <div className="p-5 space-y-2">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />
                    ))}
                  </div>
                )}

                {lbError && !lbLoading && (
                  <p className="px-5 py-4 text-sm text-red-500">{lbError}</p>
                )}

                {!lbLoading && !lbError && rows.length === 0 && (
                  <div className="py-10 text-center">
                    <p className="text-2xl mb-2">🏁</p>
                    <p className="text-sm text-gray-400">No runs logged this week yet.</p>
                    <button
                      onClick={() => navigate('/track')}
                      className="mt-3 text-sm font-semibold text-orange-500 hover:text-orange-600"
                    >
                      Be the first →
                    </button>
                  </div>
                )}

                {!lbLoading && !lbError && rows.length > 0 && (
                  <LeaderboardTable rows={rows} currentUserId={user?.id ?? ''} creatorId={club.creatorId} />
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function LeaderboardTable({ rows, currentUserId, creatorId }: { rows: LeaderboardRow[]; currentUserId: string; creatorId: string }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-gray-400 bg-gray-50/80">
          <th className="py-2.5 pl-5 pr-3 text-left font-medium w-14">Rank</th>
          <th className="px-3 py-2.5 text-left font-medium">Name</th>
          <th className="px-3 py-2.5 text-right font-medium">Km</th>
          <th className="py-2.5 pl-3 pr-5 text-right font-medium">Runs</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const isMe = row.userId === currentUserId;
          const isOwner = row.userId === creatorId;
          const isFirst = row.rank === 1;
          return (
            <tr
              key={row.userId}
              className={`border-t border-gray-50 ${
                isMe
                  ? 'bg-teal-50'
                  : isFirst
                  ? 'bg-orange-50/60'
                  : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
              }`}
            >
              <td className="py-3.5 pl-5 pr-3">
                {isFirst ? (
                  <span className="text-xl">👑</span>
                ) : (
                  <span className={`text-sm font-bold ${isMe ? 'text-teal-600' : 'text-gray-400'}`}>
                    {row.rank}
                  </span>
                )}
              </td>
              <td className="px-3 py-3.5">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isMe
                      ? 'bg-teal-100 text-teal-700'
                      : isFirst
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {row.firstName[0]?.toUpperCase()}
                  </div>
                  <span className={`font-medium ${isMe ? 'text-teal-700' : 'text-gray-900'}`}>
                    {row.firstName}
                    {isMe && <span className="ml-1.5 text-xs text-teal-400 font-normal">you</span>}
                  </span>
                  {isOwner && (
                    <span className="rounded-full bg-orange-100 border border-orange-200 px-1.5 py-0.5 text-xs font-semibold text-orange-600">
                      owner
                    </span>
                  )}
                </div>
              </td>
              <td className="px-3 py-3.5 text-right">
                <span className={`inline-flex items-center gap-0.5 rounded-lg px-2.5 py-1 text-sm font-bold border ${
                  isMe
                    ? 'bg-teal-50 border-teal-100 text-teal-600'
                    : isFirst
                    ? 'bg-orange-50 border-orange-100 text-orange-500'
                    : 'bg-gray-100 border-gray-200 text-gray-700'
                }`}>
                  {row.weeklyKm.toFixed(1)}
                  <span className="text-xs font-normal opacity-60">km</span>
                </span>
              </td>
              <td className={`py-3.5 pl-3 pr-5 text-right text-sm font-medium ${isMe ? 'text-teal-500' : 'text-gray-400'}`}>
                {row.runCount}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function NavItem({ label, icon, active, onClick }: { label: string; icon?: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
        active ? 'bg-white/20 text-white' : 'text-orange-100 hover:bg-white/10 hover:text-white'
      }`}
    >
      {icon}{label}
    </button>
  );
}
function GridIcon() {
  return <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
}
function ActivityIcon() {
  return <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
}
function ClubsIcon() {
  return <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function PinIcon() {
  return <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
}
