import { useEffect, useState } from 'react'
import { getNews } from '../lib/api'
import { Card, Button, EmptyState } from '../components/ui'
import type { NewsFeed } from '../lib/types'

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const diffMs = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function News() {
  const [feed, setFeed] = useState<NewsFeed | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = (forceRefresh = false) => {
    (forceRefresh ? setRefreshing : setLoading)(true)
    getNews(forceRefresh)
      .then(setFeed)
      .finally(() => { setLoading(false); setRefreshing(false) })
  }
  useEffect(() => load(), [])

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">DPDP News</h1>
          <p className="text-xs text-stone-500">Recent coverage of the DPDP Act, Rules and Data Protection Board — for awareness, not a compliance data source.</p>
        </div>
        <Button onClick={() => load(true)} className={refreshing ? 'opacity-50' : ''}>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {feed && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {feed.disclaimer}
        </div>
      )}

      {feed?.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {feed.error} — showing the last successfully fetched results, if any.
        </div>
      )}

      <Card>
        {loading && <div className="p-6 text-xs text-stone-400">Loading…</div>}
        {!loading && feed && feed.items.length === 0 && (
          <EmptyState title="No news fetched yet" body="Try Refresh, or check back later." />
        )}
        {!loading && feed && feed.items.length > 0 && (
          <div className="divide-y divide-stone-100">
            {feed.items.map((item, i) => (
              <a
                key={i}
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="block px-4 py-3 hover:bg-stone-50"
              >
                <div className="text-sm text-stone-800">{item.title}</div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-stone-400">
                  {item.source && <span className="font-medium text-stone-500">{item.source}</span>}
                  {item.published_at && <span>· {timeAgo(item.published_at)}</span>}
                </div>
              </a>
            ))}
          </div>
        )}
      </Card>

      {feed?.fetched_at && (
        <p className="text-[11px] text-stone-400">Last fetched: {new Date(feed.fetched_at).toLocaleString('en-IN')}</p>
      )}
    </div>
  )
}
