import { useEffect, useState } from 'react'

function backendOrigin(apiUrl: string): string {
  return apiUrl.replace(/\/api\/v1\/?$/i, '')
}

export default function App() {
  const apiUrl = import.meta.env.VITE_API_URL
  const mapboxConfigured = Boolean(import.meta.env.VITE_MAPBOX_TOKEN)
  const [health, setHealth] = useState<'idle' | 'ok' | 'error'>('idle')

  useEffect(() => {
    const origin = backendOrigin(apiUrl)
    fetch(`${origin}/health`)
      .then((r) => (r.ok ? setHealth('ok') : setHealth('error')))
      .catch(() => setHealth('error'))
  }, [apiUrl])

  return (
    <div className="min-h-svh bg-zinc-950 text-zinc-100">
      <main className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-16">
        <p className="text-sm font-medium tracking-wide text-emerald-400/90">
          PaceTrack
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Frontend is running
        </h1>
        <p className="text-zinc-400">
          Vite + React + TypeScript + Tailwind. Start the backend with{' '}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-sm text-zinc-200">
            npm run dev
          </code>{' '}
          in <code className="text-zinc-300">backend/</code>, then reload — the
          status below should turn green.
        </p>
        <dl className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">API base</dt>
            <dd className="truncate text-zinc-300" title={apiUrl}>
              {apiUrl}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Backend health</dt>
            <dd>
              {health === 'idle' && (
                <span className="text-zinc-500">Checking…</span>
              )}
              {health === 'ok' && (
                <span className="text-emerald-400">Connected</span>
              )}
              {health === 'error' && (
                <span className="text-amber-400">Unreachable</span>
              )}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Mapbox token</dt>
            <dd className={mapboxConfigured ? 'text-emerald-400' : 'text-zinc-500'}>
              {mapboxConfigured ? 'Set' : 'Not set'}
            </dd>
          </div>
        </dl>
      </main>
    </div>
  )
}
