'use client'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems: number
  pageSize: number
}

export default function Pagination({ currentPage, totalPages, onPageChange, totalItems, pageSize }: PaginationProps) {
  if (totalPages <= 1) return null

  const start = (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, totalItems)

  const getPages = () => {
    const pages: (number | '...')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push('...')
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i)
      }
      if (currentPage < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-zinc-200 bg-zinc-50/50">
      <span className="text-xs text-zinc-500">
        Mostrando <strong>{start}</strong>–<strong>{end}</strong> de <strong>{totalItems}</strong>
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {getPages().map((p, i) =>
          p === '...' ? (
            <span key={`dot-${i}`} className="px-2 text-xs text-zinc-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`min-w-[32px] h-8 rounded-lg text-xs font-medium transition-colors ${
                p === currentPage
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
