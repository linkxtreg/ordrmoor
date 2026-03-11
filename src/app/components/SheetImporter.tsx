import { useState, useRef } from 'react';
import { FileSpreadsheet, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { MenuItem, Category } from '../types/menu';
import type { OptionGroup, MatrixOption, PricingMatrix, PricingMatrixCell } from '../types/menu';
import { normalizePricingModel } from '../lib/pricing';
import { toast } from 'sonner';
import { useAdminLanguage } from '../context/AdminLanguageContext';

// Template CSV: exact columns users must fill. Optional "id" for updating existing items.
// Simple item: pricing_mode=flat, matrix_prices=single value (e.g. 50)
// Matrix item: pricing_mode=matrix, fill row_options_*, col_options_*, matrix_prices (row-major)
const IMPORT_TEMPLATE_CSV = `category_name_en,category_name_ar,name_en,name_ar,pricing_mode,row_options_en,row_options_ar,col_options_en,col_options_ar,matrix_prices,is_popular,description_en,description_ar,id
Main Course,اطباق رئيسية,White Sauce Pasta,مكرونة وايت صوص,flat,,,,,50,yes,White sauce pasta,باستا وايت صوص,
Main Course,اطباق رئيسية,Burger Original,برجر أوريجينال,matrix,"Single,Double","فردي،دبل","Sandwich,+Fries,Combo","ساندويتش،بطاطس،كومبو","155,185,210,185,215,240",yes,Burger with options,برجر بخيارات,`;

interface SheetImporterProps {
  existingItems: MenuItem[];
  categories: Category[];
  onImportItems: (upsert: { toAdd: MenuItem[]; toUpdate: MenuItem[] }) => Promise<void>;
  onImportCategories: (categories: Category[]) => Promise<void>;
  onClose: () => void;
}

interface ImportResult {
  toAdd: MenuItem[];
  toUpdate: MenuItem[];
  categories: Category[];
  errors: string[];
}

/** Find an existing item that matches this parsed row: by id (if row has id) or by category + name. */
function findMatchingExisting(
  parsed: { id?: string; category: string; name: string; nameEn?: string; nameAr?: string },
  existingItems: MenuItem[]
): MenuItem | null {
  const rowId = (parsed.id && String(parsed.id).trim()) || undefined;
  if (rowId) {
    const byId = existingItems.find((i) => i.id === rowId);
    if (byId) return byId;
  }
  const cat = parsed.category;
  const nameEn = (parsed.nameEn || '').trim();
  const nameAr = (parsed.nameAr || '').trim();
  const name = (parsed.name || '').trim();
  return existingItems.find((i) => {
    if (i.category !== cat) return false;
    if (name && i.name === name) return true;
    if (nameEn && (i.nameEn === nameEn || i.name === nameEn)) return true;
    if (nameAr && (i.nameAr === nameAr || i.name === nameAr)) return true;
    return false;
  }) ?? null;
}

/** Split by comma (and Arabic comma ،) and trim. */
function splitOptions(value: string | undefined): string[] {
  if (value == null || String(value).trim() === '') return [];
  return String(value)
    .split(/[,،]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Parse comma-separated prices; returns array of numbers (0 for invalid). */
function splitPrices(value: string | undefined): number[] {
  return splitOptions(value).map((s) => {
    const n = parseFloat(s);
    return Number.isNaN(n) ? 0 : n;
  });
}

/** Escape a CSV field: wrap in quotes if needed and double internal quotes. */
function csvEscape(value: string): string {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

const EXPORT_CSV_HEADERS = 'category_name_en,category_name_ar,name_en,name_ar,pricing_mode,row_options_en,row_options_ar,col_options_en,col_options_ar,matrix_prices,is_popular,description_en,description_ar,id';

export function SheetImporter({ existingItems, categories, onImportItems, onImportCategories, onClose }: SheetImporterProps) {
  const { t, dir } = useAdminLanguage();
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const blob = new Blob(['\uFEFF' + IMPORT_TEMPLATE_CSV], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'menu-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('importPopup.templateDownloaded'));
  };

  /** Export current menu items in the same format as the import template so user can add more and re-upload. */
  const downloadCurrentMenu = () => {
    const categoryAr = new Map<string, string>();
    categories.forEach((c) => categoryAr.set(c.name, c.nameAr ?? ''));
    const rows = existingItems
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((item) => {
        const catAr = categoryAr.get(item.category) ?? '';
        const nameEn = item.nameEn ?? item.name ?? '';
        const nameAr = item.nameAr ?? '';
        let pricingMode = 'flat';
        let rowOptsEn = '';
        let rowOptsAr = '';
        let colOptsEn = '';
        let colOptsAr = '';
        let matrixPrices = '';

        const model = normalizePricingModel(item);
        if (model.kind === 'matrix') {
          pricingMode = 'matrix';
          const { optionGroups, pricingMatrix } = model;
          const rowGroup = optionGroups.find((g) => g.id === pricingMatrix.rowGroupId);
          const colGroup = optionGroups.find((g) => g.id === pricingMatrix.columnGroupId);
          const rowOpts = rowGroup?.options ?? [];
          const colOpts = colGroup?.options ?? [];
          rowOptsEn = rowOpts.map((o) => o.nameEn ?? o.name ?? '').join(',');
          rowOptsAr = rowOpts.map((o) => o.nameAr ?? '').join(',');
          colOptsEn = colOpts.map((o) => o.nameEn ?? o.name ?? '').join(',');
          colOptsAr = colOpts.map((o) => o.nameAr ?? '').join(',');
          const cells = pricingMatrix.cells ?? [];
          const rowMajor: number[] = [];
          for (const ro of rowOpts) {
            for (const co of colOpts) {
              const c = cells.find((x) => x.rowOptionId === ro.id && x.columnOptionId === co.id);
              const price = c?.discountedPrice != null && c.discountedPrice > 0 ? c.discountedPrice : (c?.price ?? 0);
              rowMajor.push(price);
            }
          }
          matrixPrices = rowMajor.map(String).join(',');
        } else if (model.variants.length > 1) {
          // Flat variants with multiple options: export as 1×N matrix to preserve all prices
          pricingMode = 'matrix';
          rowOptsEn = 'Default';
          rowOptsAr = 'افتراضي';
          colOptsEn = model.variants.map((v) => v.nameEn ?? v.name ?? '').join(',');
          colOptsAr = model.variants.map((v) => v.nameAr ?? '').join(',');
          matrixPrices = model.variants
            .map((v) => (v.discountedPrice != null && v.discountedPrice > 0 ? v.discountedPrice : v.price))
            .map(String)
            .join(',');
        } else {
          const p = model.variants[0];
          matrixPrices = String(p ? (p.discountedPrice != null && p.discountedPrice > 0 ? p.discountedPrice : p.price) : (item.price ?? ''));
        }

        const popular = item.isPopular ? 'yes' : 'no';
        const descEn = item.descriptionEn ?? item.description ?? '';
        const descAr = item.descriptionAr ?? '';
        const id = item.id ?? '';
        return [
          csvEscape(item.category),
          csvEscape(catAr),
          csvEscape(nameEn),
          csvEscape(nameAr),
          csvEscape(pricingMode),
          csvEscape(rowOptsEn),
          csvEscape(rowOptsAr),
          csvEscape(colOptsEn),
          csvEscape(colOptsAr),
          csvEscape(matrixPrices),
          csvEscape(popular),
          csvEscape(descEn),
          csvEscape(descAr),
          csvEscape(id),
        ].join(',');
      });
    const csv = '\uFEFF' + EXPORT_CSV_HEADERS + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'menu-export.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('importPopup.currentMenuDownloaded'));
  };

  const parseExcelFile = (file: File): Promise<ImportResult> => {
    const existing = existingItems;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const isCsv = /\.csv$/i.test(file.name);

      reader.onload = (e) => {
        (async () => {
          try {
          const XLSX = await import('xlsx');
          const data = e.target?.result;
          const workbook = isCsv && typeof data === 'string'
            ? XLSX.read(data, { type: 'string', raw: true })
            : XLSX.read(data, {
                type: 'binary',
                codepage: 65001,
                cellText: false,
                cellDates: true,
              });

          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);
          // Normalize keys: strip UTF-8 BOM from first header so column names match (e.g. "\ufeffcategory_name_en" -> "category_name_en")
          const jsonData = rawData.map((row: any) => {
            const out: Record<string, unknown> = {};
            for (const key of Object.keys(row)) {
              const cleanKey = key.replace(/^\uFEFF/, '').trim();
              out[cleanKey] = row[key];
            }
            return out as Record<string, string | number | undefined>;
          });

          const items: MenuItem[] = [];
          const categoryMap = new Map<string, { nameEn: string; nameAr: string }>();
          const errors: string[] = [];

          for (let index = 0; index < jsonData.length; index++) {
            const row = jsonData[index];
            try {
              const categoryNameEn = String(row['category_name_en'] ?? '').trim() || 'Uncategorized';
              const categoryNameAr = String(row['category_name_ar'] ?? '').trim();
              categoryMap.set(categoryNameEn, { nameEn: categoryNameEn, nameAr: categoryNameAr });

              const nameEn = String(row['name_en'] ?? '').trim();
              const nameAr = String(row['name_ar'] ?? '').trim();
              const name = nameEn || nameAr || '';
              if (!name) {
                errors.push(`Row ${index + 2}: Missing name_en or name_ar`);
                continue;
              }

              const pricingModeRaw = String(row['pricing_mode'] ?? 'flat').trim().toLowerCase();
              const useMatrix = pricingModeRaw === 'matrix';

              const rowOptsEn = splitOptions(row['row_options_en']);
              const rowOptsAr = splitOptions(row['row_options_ar']);
              const colOptsEn = splitOptions(row['col_options_en']);
              const colOptsAr = splitOptions(row['col_options_ar']);
              const matrixPricesRaw = splitPrices(row['matrix_prices']);

              let optionGroups: OptionGroup[] | undefined;
              let pricingMatrix: PricingMatrix | undefined;
              let price = 0;

              if (useMatrix && (rowOptsEn.length > 0 || rowOptsAr.length > 0) && (colOptsEn.length > 0 || colOptsAr.length > 0) && matrixPricesRaw.length > 0) {
                const rowGroupId = 'rg-' + crypto.randomUUID().slice(0, 8);
                const colGroupId = 'cg-' + crypto.randomUUID().slice(0, 8);
                const rowOptions: MatrixOption[] = Array.from(
                  { length: Math.max(rowOptsEn.length, rowOptsAr.length) },
                  (_, i) => ({
                    id: 'ro-' + crypto.randomUUID().slice(0, 8),
                    nameEn: rowOptsEn[i] || undefined,
                    nameAr: rowOptsAr[i] || undefined,
                    name: rowOptsEn[i] || rowOptsAr[i] || `Row ${i + 1}`,
                  })
                );
                const colOptions: MatrixOption[] = Array.from(
                  { length: Math.max(colOptsEn.length, colOptsAr.length) },
                  (_, i) => ({
                    id: 'co-' + crypto.randomUUID().slice(0, 8),
                    nameEn: colOptsEn[i] || undefined,
                    nameAr: colOptsAr[i] || undefined,
                    name: colOptsEn[i] || colOptsAr[i] || `Col ${i + 1}`,
                  })
                );
                const cells: PricingMatrixCell[] = [];
                let pi = 0;
                for (const ro of rowOptions) {
                  for (const co of colOptions) {
                    cells.push({
                      rowOptionId: ro.id,
                      columnOptionId: co.id,
                      price: matrixPricesRaw[pi] ?? 0,
                    });
                    pi++;
                  }
                }
                optionGroups = [
                  { id: rowGroupId, labelEn: 'Row', labelAr: 'الصف', label: 'Row', options: rowOptions },
                  { id: colGroupId, labelEn: 'Column', labelAr: 'العمود', label: 'Column', options: colOptions },
                ];
                pricingMatrix = { rowGroupId, columnGroupId: colGroupId, cells };
                const cellPrices = cells.map((c) => c.price).filter((p) => p > 0);
                price = cellPrices.length > 0 ? Math.min(...cellPrices) : (cells[0]?.price ?? 0);
              } else {
                price = matrixPricesRaw.length > 0 ? (matrixPricesRaw[0] ?? 0) : 0;
              }

              const isPopularRaw = String(row['is_popular'] ?? '').trim().toLowerCase();
              const isPopular = isPopularRaw === 'yes' || isPopularRaw === 'true' || isPopularRaw === '1';

              const descriptionEn = String(row['description_en'] ?? '').trim();
              const descriptionAr = String(row['description_ar'] ?? '').trim();
              const description = descriptionEn || descriptionAr || '';

              const rowId = (row['id'] != null && String(row['id']).trim() !== '') ? String(row['id']).trim() : undefined;

              const item: MenuItem = {
                id: rowId || crypto.randomUUID(),
                name,
                nameEn: nameEn || undefined,
                nameAr: nameAr || undefined,
                category: categoryNameEn,
                description,
                descriptionEn: descriptionEn || undefined,
                descriptionAr: descriptionAr || undefined,
                price,
                optionGroups,
                pricingMatrix,
                image: '',
                isAvailable: true,
                isPopular,
              };
              items.push(item);
            } catch (err) {
              errors.push(`Row ${index + 2}: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
          }

          const categoryList: Category[] = Array.from(categoryMap.entries()).map(([nameEn, { nameAr }]) => ({
            id: crypto.randomUUID(),
            name: nameEn,
            nameAr: nameAr || undefined,
            color: '#6366f1',
            description: '',
          }));

          // Split into toAdd (new) and toUpdate (existing): match by id or by category+name
          const toAdd: MenuItem[] = [];
          const toUpdate: MenuItem[] = [];
          for (const item of items) {
            const existingItem = findMatchingExisting(
              { id: item.id, category: item.category, name: item.name, nameEn: item.nameEn, nameAr: item.nameAr },
              existing
            );
            if (existingItem) {
              toUpdate.push({
                ...item,
                id: existingItem.id,
                order: existingItem.order,
                image: existingItem.image || '',
              });
            } else {
              toAdd.push({ ...item, id: crypto.randomUUID() });
            }
          }

          resolve({ toAdd, toUpdate, categories: categoryList, errors });
          } catch (error) {
            reject(error);
          }
        })();
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      if (isCsv) {
        reader.readAsText(file, 'UTF-8');
      } else {
        reader.readAsBinaryString(file);
      }
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ];
    
    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      toast.error('Please upload a valid Excel (.xlsx, .xls) or CSV file');
      return;
    }

    setImporting(true);
    try {
      const result = await parseExcelFile(file);
      setPreview(result);
      
      if (result.errors.length > 0) {
        toast.warning(t('importPopup.importedWithWarnings', { count: String(result.errors.length) }));
      }
    } catch (error) {
      toast.error(t('importPopup.parseError') + ': ' + (error instanceof Error ? error.message : 'Unknown error'));
      console.error('Import error:', error);
    } finally {
      setImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!preview) return;

    setImporting(true);
    try {
      // Import categories first
      if (preview.categories.length > 0) {
        await onImportCategories(preview.categories);
      }

      // Then upsert items (add new + update existing)
      const totalItems = preview.toAdd.length + preview.toUpdate.length;
      if (totalItems > 0) {
        await onImportItems({ toAdd: preview.toAdd, toUpdate: preview.toUpdate });
      }

      toast.success(t('importPopup.importSuccess', { items: String(totalItems), categories: String(preview.categories.length) }));
      onClose();
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      toast.error(t('importPopup.importError') + ': ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setImporting(false);
    }
  };

  const handleCancel = () => {
    setPreview(null);
    onClose();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir={dir}>
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileSpreadsheet size={24} className="text-green-600" />
            {t('importPopup.title')}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {t('importPopup.subtitle')}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!preview ? (
            <div>
              {existingItems.length === 0 ? (
                <>
                  {/* Empty menu: 1. Download template, 2. Template columns, 3. Upload */}
                  <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-[#f9faf3] border border-stone-200 rounded-lg">
                    <div>
                      <h3 className="font-semibold text-[#101010] mb-1">{t('importPopup.step1Title')}</h3>
                      <p className="text-sm text-[#52525c]">{t('importPopup.step1Desc')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={downloadTemplate}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#101010] text-[#cfff5e] rounded-lg hover:bg-[#cfff5e] hover:text-[#101010] transition-colors font-medium shrink-0"
                    >
                      <Download size={18} />
                      {t('importPopup.downloadTemplate')}
                    </button>
                  </div>

                  <div className="bg-[#f9faf3] border border-stone-200 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-[#101010] mb-2">{t('importPopup.step2Title')}</h3>
                    <ul className="text-sm text-[#52525c] space-y-1 list-disc list-inside">
                      <li>{t('importPopup.colCategory')}</li>
                      <li>{t('importPopup.colName')}</li>
                      <li>{t('importPopup.colOptions')}</li>
                      <li>{t('importPopup.colPrices')}</li>
                      <li>{t('importPopup.colPopular')}</li>
                      <li>{t('importPopup.colDesc')}</li>
                      <li>{t('importPopup.colId')}</li>
                    </ul>
                  </div>

                  <h3 className="font-semibold text-[#101010] mb-2">{t('importPopup.step3Title')}</h3>
                </>
              ) : (
                <>
                  {/* Has items: 1. Export current menu, 2. Upload your filled file */}
                  <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-[#f9faf3] border border-stone-200 rounded-lg">
                    <div>
                      <h3 className="font-semibold text-[#101010] mb-1">{t('importPopup.step1ExportTitle')}</h3>
                      <p className="text-sm text-[#52525c]">{t('importPopup.step1ExportDesc')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={downloadCurrentMenu}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#101010] text-[#cfff5e] rounded-lg hover:bg-[#cfff5e] hover:text-[#101010] transition-colors font-medium shrink-0"
                    >
                      <Download size={18} />
                      {t('importPopup.downloadCurrentMenu')}
                    </button>
                  </div>

                  <h3 className="font-semibold text-[#101010] mb-2">{t('importPopup.step2UploadTitle')}</h3>
                </>
              )}

              {/* File Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-500 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  disabled={importing}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  <FileSpreadsheet size={48} className="text-gray-400" />
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      {importing ? t('importPopup.processing') : t('importPopup.clickUpload')}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {t('importPopup.fileTypes')}
                    </p>
                  </div>
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Import Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-900 font-semibold mb-1">
                    <CheckCircle size={20} />
                    {t('importPopup.itemsFound')}
                  </div>
                  <div className="text-3xl font-bold text-green-700">{preview.toAdd.length + preview.toUpdate.length}</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-900 font-semibold mb-1">
                    <CheckCircle size={20} />
                    {t('importPopup.toAdd')}
                  </div>
                  <div className="text-3xl font-bold text-blue-700">{preview.toAdd.length}</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-amber-900 font-semibold mb-1">
                    <CheckCircle size={20} />
                    {t('importPopup.toUpdate')}
                  </div>
                  <div className="text-3xl font-bold text-amber-700">{preview.toUpdate.length}</div>
                </div>
                <div className="bg-[#f9faf3] border border-stone-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-[#101010] font-semibold mb-1">
                    <CheckCircle size={20} />
                    {t('importPopup.categoriesFound')}
                  </div>
                  <div className="text-3xl font-bold text-[#52525c]">{preview.categories.length}</div>
                </div>
              </div>

              {/* Errors */}
              {preview.errors.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-yellow-900 font-semibold mb-2">
                    <AlertCircle size={20} />
                    {t('importPopup.warningsCount', { count: String(preview.errors.length) })}
                  </div>
                  <div className="max-h-32 overflow-y-auto">
                    <ul className="text-sm text-yellow-800 space-y-1">
                      {preview.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={importing}
          >
            {t('importPopup.cancel')}
          </button>
          {preview && (
            <button
              onClick={handleConfirmImport}
              disabled={importing || (preview.toAdd.length === 0 && preview.toUpdate.length === 0)}
              className="px-4 py-2 bg-[#101010] text-[#cfff5e] rounded-lg hover:bg-[#cfff5e] hover:text-[#101010] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {importing ? t('importPopup.importing') : t('importPopup.importCount', { count: String(preview.toAdd.length + preview.toUpdate.length) })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}