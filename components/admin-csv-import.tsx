'use client';
import { useState, type ChangeEvent } from 'react';
import type { CatalogDevice } from '@/lib/catalog';
import { csvTemplate, parseInventoryCsv, type InventoryCsvRow } from '@/lib/inventory-csv';
import { getBrowserSupabase } from '@/lib/browser/supabase';

type ProductRef = { id: string; variants: { id: string; sku: string }[] };
type Mode = 'create' | 'update' | 'skip';
export function AdminCsvImport({ products, devices, onImported }: {
  products: ProductRef[]; devices: CatalogDevice[]; onImported: () => Promise<void>;
}) {
  const [rows, setRows] = useState<InventoryCsvRow[]>([]);
  const [mode, setMode] = useState<Mode>('skip');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState<string[]>([]);

  function downloadTemplate() {
    const blob = new Blob([csvTemplate], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'alter-case-inventario.csv';
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    setRows([]); setError(''); setReport([]);
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv') || file.size > 1024 * 1024) {
      setError('Solo se acepta CSV de hasta 1 MB.'); return;
    }
    try { setRows(parseInventoryCsv(await file.text())); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Archivo inválido.'); }
  }
  const skuMap = new Map(products.flatMap(p => p.variants.map(v => [v.sku, v.id] as const)));
  const verified = rows.map(row => ({
    ...row, errors: [...row.errors, ...(!devices.some(d => d.id === row.deviceId) ? ['Modelo no registrado'] : [])],
  }));
  const valid = verified.filter(row => !row.errors.length);
  async function apply() {
    if (!valid.length || busy || verified.some(row => row.errors.length)) return;
    if (!window.confirm(`¿Procesar ${valid.length} filas? Los cambios se guardarán individualmente en PostgreSQL.`)) return;
    const client = getBrowserSupabase();
    if (!client) { setError('Conecta la autenticación ALTER / CASE.'); return; }
    setBusy(true); setError(''); setReport([]);
    const results: string[] = [];
    try {
      for (const row of valid) {
        const existingId = skuMap.get(row.sku);
        if (existingId && mode === 'skip') { results.push(`Fila ${row.row}: ignorada, SKU existente`); continue; }
        if (existingId && mode === 'create') { results.push(`Fila ${row.row}: conflicto, SKU ya existe`); continue; }
        const { data } = await client.auth.getSession();
        if (!data.session) throw new Error('La sesión expiró; inicia sesión de nuevo.');
        const slugBase = row.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
          .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70) || 'case';
        const createBody = {
          name: row.name, slug: `${slugBase}-${crypto.randomUUID().slice(0,8)}`,
          description: row.description, productType: 'CASE', compatibilityMode: 'DEVICE_SPECIFIC',
          variants: [{ sku: row.sku, color: row.color, price: row.price, quantity: row.quantity,
            deviceIds: [row.deviceId], brandIds: [], requiredCapabilities: [] }],
        };
        const response = await fetch(existingId ? `/api/admin/variants/${existingId}` : '/api/admin/products', {
          method: existingId ? 'PATCH' : 'POST',
          headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(existingId ? { price: row.price, quantity: row.quantity } : createBody),
        });
        const payload = await response.json();
        results.push(response.ok ? `Fila ${row.row}: ${existingId ? 'actualizada' : 'creada'}` :
          `Fila ${row.row}: error — ${payload.error?.message || response.status}`);
        setReport([...results]);
      }
      await onImported();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Importación interrumpida.'); }
    finally { setBusy(false); }
  }
  return <section className="admin-v2-panel" aria-label="Importación masiva CSV">
    <div className="admin-v2-panel-heading"><div><h2>Importar inventario CSV</h2><p className="muted">Hasta 100 filas. Revisa los datos antes de aplicar cambios.</p></div>
      <button type="button" className="action-light" onClick={downloadTemplate}>Descargar plantilla CSV</button></div>
    <div className="admin-v2-form">
      <label>Archivo CSV<input type="file" accept=".csv,text/csv" onChange={selectFile}/></label>
      <label>Qué hacer cuando un SKU ya existe
        <select value={mode} onChange={event => setMode(event.target.value as Mode)}>
          <option value="skip">Ignorar SKU existente</option>
          <option value="update">Actualizar su precio y existencias</option>
          <option value="create">Crear únicamente nuevos, reportar duplicados</option>
        </select></label>
    </div>
    {error && <p role="alert" className="form-error">{error}</p>}
    {rows.length > 0 && <><p className="muted mt-5">{valid.length} filas válidas de {rows.length}. Verifica los cambios antes de confirmar.</p>
      <div className="admin-v2-table-wrap"><table><thead><tr><th>Fila</th><th>SKU</th><th>Case / modelo</th><th>Precio COP</th><th>Stock</th><th>Validación</th></tr></thead><tbody>
        {verified.map(row => <tr key={row.row}><td>{row.row}</td><td>{row.sku}</td><td>{row.name}<small>{devices.find(d=>d.id===row.deviceId)?.name || row.deviceId}</small></td>
          <td>{row.price}</td><td>{row.quantity}</td><td>{row.errors.length ? <span className="form-error">{row.errors.join(', ')}</span> : 'Correcto'}</td></tr>)}
      </tbody></table></div>
      <button type="button" className="action-primary" onClick={apply} disabled={busy || !!verified.some(row=>row.errors.length)}>
        {busy ? 'Procesando…' : `Confirmar importación de ${valid.length} filas`}</button>
    </>}
    {report.length > 0 && <div role="status"><h3 className="mt-6 font-bold">Resultado por fila</h3><ul className="mt-3 text-sm">{report.map((line,i)=><li key={i}>{line}</li>)}</ul></div>}
    <p className="muted mt-5 text-xs">El CSV crea nuevas referencias y actualiza precio/stock de SKU existentes. No cambia compatibilidad de variantes existentes; no es una operación atómica global. Para XLSX exporta primero como CSV.</p>
  </section>;
}
