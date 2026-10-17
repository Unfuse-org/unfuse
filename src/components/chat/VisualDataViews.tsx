import { useRef, useState } from 'react';

export function DataChart({ rows, unit }: { rows: { label: string; value: number }[]; unit: string }) {
  const [active, setActive] = useState<string | null>(null);
  const valid = rows.every(row => Number.isFinite(row.value) && row.value >= 0);
  if (!valid) return <p role="alert" className="text-xs text-[var(--text-muted)]">This chart contains invalid values.</p>;
  if (!rows.length) return <p className="text-xs text-[var(--text-muted)]">No chart data available.</p>;
  const maximum = Math.max(...rows.map(row => row.value), 1);
  return <figure className="space-y-3"><figcaption className="text-[11px] text-[var(--text-muted)]">{unit} · Bars share a scale from 0 to {maximum}</figcaption>{rows.map(row => <button key={row.label} type="button" onMouseEnter={() => setActive(row.label)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(row.label)} onBlur={() => setActive(null)} onClick={() => setActive(row.label)} aria-label={`${row.label}: ${row.value} ${unit}`} className="flex w-full items-center gap-3 text-xs text-left rounded-md py-1 focus-visible:outline focus-visible:outline-[var(--accent)]"><span className="w-12 shrink-0 text-[var(--text-muted)]">{row.label}</span><span className="flex-1 h-5 bg-[var(--bg-surface)] rounded overflow-hidden"><span className="block h-full bg-[var(--accent)] rounded" style={{ width: `${row.value / maximum * 100}%`, opacity: active && active !== row.label ? 0.5 : 1 }} /></span><span className="w-16 shrink-0 text-right tabular-nums">{row.value} {unit}</span></button>)}<p aria-live="polite" className="min-h-4 text-[11px] text-[var(--text-muted)]">{active ? `${active}: ${rows.find(row => row.label === active)?.value} ${unit}` : 'Hover, focus, or select a bar to inspect its value.'}</p></figure>;
}

export function DataTable({ rows, columns }: { rows: string[][]; columns: string[] }) {
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<{ column: number; descending: boolean } | null>(null);
  const [feedback, setFeedback] = useState('');
  const shown = rows.filter(row => row.some(cell => cell.toLowerCase().includes(filter.toLowerCase())));
  if (sort) shown.sort((a, b) => a[sort.column].localeCompare(b[sort.column], undefined, { numeric: true }) * (sort.descending ? -1 : 1));
  const csv = [columns, ...shown].map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const download = () => {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'table.csv'; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className="space-y-3"><div className="flex flex-wrap items-center gap-3 text-xs"><input aria-label="Filter table" placeholder="Filter rows…" value={filter} onChange={event => setFilter(event.target.value)} className="min-w-0 flex-1 rounded-md bg-[var(--bg-surface)] px-3 py-2 outline-none focus:ring-1 focus:ring-[var(--accent)]" /><button onClick={() => { void navigator.clipboard.writeText(csv).then(() => setFeedback('Copied visible rows'), () => setFeedback('Copy unavailable; use CSV export')); }}>Copy</button><button onClick={download}>Export CSV</button></div><div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead><tr>{columns.map((label, column) => <th key={label} aria-sort={sort?.column === column ? sort.descending ? 'descending' : 'ascending' : 'none'} className="py-3 pr-3 border-b border-[var(--border-strong)]"><button onClick={() => setSort({ column, descending: sort?.column === column && !sort.descending })}>{label} {sort?.column === column ? sort.descending ? '↓' : '↑' : '↕'}</button></th>)}</tr></thead><tbody>{shown.map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column} className="py-3 pr-3 border-b border-[var(--border-subtle)]">{cell}</td>)}</tr>)}</tbody></table></div>{!shown.length && <p className="text-xs text-[var(--text-muted)]">{rows.length ? 'No rows match your filter.' : 'No rows available.'}</p>}<p role="status" className="text-[11px] text-[var(--text-muted)]">{feedback || `${shown.length} of ${rows.length} rows`}</p></section>;
}

export function DiagramView({ svg, title }: { svg: string; title: string }) {
  const [zoom, setZoom] = useState(1);
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const fit = () => { setZoom(1); viewport.current?.scrollTo({ left: 0, top: 0 }); };
  return <section className="space-y-3"><div className="flex items-center gap-3 text-xs"><button aria-label="Zoom out diagram" disabled={zoom <= 0.5} onClick={() => setZoom(value => Math.max(0.5, value - 0.25))} className="disabled:opacity-30">−</button><span className="tabular-nums">{Math.round(zoom * 100)}%</span><button aria-label="Zoom in diagram" disabled={zoom >= 3} onClick={() => setZoom(value => Math.min(3, value + 0.25))} className="disabled:opacity-30">+</button><button onClick={fit}>Fit to view</button><span className="text-[var(--text-muted)]">Drag to pan</span></div><div ref={viewport} tabIndex={0} aria-label={`${title}, scroll or drag to pan`} className="overflow-auto max-h-[60vh] touch-none cursor-grab active:cursor-grabbing focus-visible:outline focus-visible:outline-[var(--accent)]" onPointerDown={event => { if (!viewport.current) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, y: event.clientY, left: viewport.current.scrollLeft, top: viewport.current.scrollTop }; }} onPointerMove={event => { if (!drag.current || !viewport.current) return; viewport.current.scrollLeft = drag.current.left - (event.clientX - drag.current.x); viewport.current.scrollTop = drag.current.top - (event.clientY - drag.current.y); }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}><img draggable={false} src={`data:image/svg+xml,${encodeURIComponent(svg)}`} alt={title} style={{ width: `${zoom * 100}%`, maxWidth: 'none' }} /></div></section>;
}
