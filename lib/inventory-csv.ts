export type InventoryCsvRow = {
  row: number; name: string; sku: string; color: string; price: number;
  quantity: number; deviceId: string; description: string; errors: string[];
};
export const csvTemplate = 'name,sku,color,price,quantity,device_id,description\n';

export function parseInventoryCsv(text: string): InventoryCsvRow[] {
  if (text.length > 1024 * 1024) throw new Error('El CSV no puede superar 1 MB.');
  const header = text.slice(0, text.indexOf('\n') < 0 ? text.length : text.indexOf('\n'));
  const delimiter = (header.match(/;/g)?.length ?? 0) > (header.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let line: string[] = [], cell = '', quoted = false;
  const source = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) { line.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[i + 1] === '\n') i++;
      line.push(cell); if (line.some(value => value.trim())) rows.push(line);
      line = []; cell = '';
    } else { cell += char; }
  }
  if (quoted) throw new Error('El CSV contiene comillas sin cerrar.');
  line.push(cell); if (line.some(value => value.trim())) rows.push(line);
  if (rows.length < 2) throw new Error('El CSV debe contener encabezados y al menos un producto.');
  if (rows.length > 101) throw new Error('Por seguridad, importa hasta 100 filas por archivo.');
  const headers = rows[0].map(value => value.trim().toLowerCase());
  const required = ['name','sku','color','price','quantity','device_id','description'];
  if (required.some(key => !headers.includes(key)) || new Set(headers).size !== headers.length)
    throw new Error('Encabezados incorrectos. Descarga y utiliza la plantilla.');
  const knownSkus = new Set<string>();
  return rows.slice(1).map((values, index) => {
    const get = (key: string) => (values[headers.indexOf(key)] || '').trim();
    const name = get('name'), sku = get('sku'), color = get('color');
    const description = get('description'), deviceId = get('device_id');
    const price = Number(get('price')), quantity = Number(get('quantity'));
    const errors: string[] = [];
    if (values.length !== headers.length) errors.push('Número de columnas incorrecto');
    if (name.length < 2 || name.length > 160) errors.push('Nombre inválido');
    if (sku.length < 3 || sku.length > 80) errors.push('SKU inválido');
    if (!color || color.length > 60) errors.push('Color inválido');
    if (!description) errors.push('Descripción vacía');
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(deviceId)) errors.push('ID del modelo inválido');
    if (!get('price') || !Number.isFinite(price) || price < 0) errors.push('Precio inválido');
    if (!get('quantity') || !Number.isSafeInteger(quantity) || quantity < 0) errors.push('Cantidad inválida');
    if (knownSkus.has(sku)) errors.push('SKU repetido en archivo');
    knownSkus.add(sku);
    return { row: index + 2, name, sku, color, description, deviceId, price, quantity, errors };
  });
}
