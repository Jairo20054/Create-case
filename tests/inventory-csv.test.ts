import { describe, expect, it } from 'vitest';
import { parseInventoryCsv, csvTemplate } from '../lib/inventory-csv';
const id = '00000000-0000-4000-8000-000000000001';
describe('Importación CSV', () => {
  it('acepta columnas válidas y cantidades enteras', () => {
    const rows = parseInventoryCsv(csvTemplate + `Case A,SKU-001,Negro,45000,8,${id},Protección real\n`);
    expect(rows[0]).toMatchObject({ sku: 'SKU-001', price: 45000, quantity: 8, errors: [] });
  });
  it('acepta campos entre comillas con delimitadores', () => {
    const rows = parseInventoryCsv(csvTemplate + `"Case, A",SKU-002,Negro,50000,1,${id},"Protección, flexible"\n`);
    expect(rows[0].name).toBe('Case, A');
  });
  it('rechaza SKU duplicados y stock negativo', () => {
    const rows = parseInventoryCsv(csvTemplate + `Case A,SKU-001,Azul,20,1,${id},Uno\nCase B,SKU-001,Rojo,20,-1,${id},Dos\n`);
    expect(rows[1].errors).toContain('SKU repetido en archivo');
    expect(rows[1].errors).toContain('Cantidad inválida');
  });
  it('rechaza encabezados incompletos', () => {
    expect(() => parseInventoryCsv('name,sku\nCase,SKU-001')).toThrow();
  });
});
