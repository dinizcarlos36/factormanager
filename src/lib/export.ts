/**
 * Export data to CSV file and trigger download.
 */
export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return

  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(';'),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h]
        if (val === null || val === undefined) return ''
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val)
        // Escape quotes and wrap in quotes if contains separator
        return str.includes(';') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str
      }).join(';')
    ),
  ]

  const BOM = '\uFEFF' // UTF-8 BOM for Excel compatibility
  const blob = new Blob([BOM + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Flatten nested objects for CSV export (e.g. { clients: { razao_social: 'X' } } → { 'cliente': 'X' })
 */
export function flattenForExport(
  data: Record<string, unknown>[],
  mapping: Record<string, string | ((row: Record<string, unknown>) => string)>
): Record<string, unknown>[] {
  return data.map(row => {
    const flat: Record<string, unknown> = {}
    for (const [key, accessor] of Object.entries(mapping)) {
      flat[key] = typeof accessor === 'function' ? accessor(row) : row[accessor]
    }
    return flat
  })
}
