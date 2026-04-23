import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Download, 
  Search, 
  Pencil, 
  Clock, 
  User, 
  Package, 
  FileText,
  ShieldCheck,
  Utensils,
  Bed
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Report } from '../types';
import { translations, Language } from '../translations';
import { Button, Card } from './UI';
import { downloadFile } from '../utils';

export const ReportsList = ({ 
  reports, 
  onSelect, 
  onNew, 
  onDelete, 
  onDeleteAll, 
  onBackup, 
  currentUser, 
  language,
  setAlertConfig
}: { 
  reports: Report[], 
  onSelect: (r: Report) => void, 
  onNew: () => void, 
  onDelete: (id: number) => void, 
  onDeleteAll: () => void, 
  onBackup: () => void, 
  currentUser: any, 
  language: Language,
  setAlertConfig: (config: any) => void
}) => {
  const t = (key: keyof typeof translations['it']) => translations[language][key];
  const [search, setSearch] = useState('');
  const filtered = reports.filter(r => 
    r.client_name?.toLowerCase().includes(search.toLowerCase()) || 
    r.description?.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA; // Descending chronological order
  });

  const handleExport = async () => {
    try {
      await downloadFile(`/api/export/reports?lang=${language}`, 'rapportini.xlsx');
    } catch (error) {
      setAlertConfig({
        isOpen: true,
        title: translations[language]['error'],
        message: 'Export failed: ' + (error as Error).message
      });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const result = event.target?.result as string;
          const base64 = result.split(',')[1];
          const res = await fetch('/api/import/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: base64 })
          });
          if (!res.ok) throw new Error(await res.text());
          window.location.reload();
        } catch (error) {
          setAlertConfig({
            isOpen: true,
            title: translations[language]['error'],
            message: 'Import failed: ' + (error as Error).message
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 flex flex-col gap-4 sticky top-0 bg-slate-50 dark:bg-slate-950 z-10 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold">{t('reports')}</h1>
          <div className="flex gap-2 flex-wrap">
            {currentUser?.type === 'admin' && (
              <>
                <button 
                  onClick={onDeleteAll}
                  className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:hover:bg-rose-900/50 transition-colors text-xs sm:text-sm font-medium border border-rose-100 dark:border-rose-900/50"
                >
                  <Trash2 size={16} />
                  <span className="hidden xs:inline">{t('delete_all_reports')}</span>
                </button>
                <label className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-100 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-200 dark:hover:hover:bg-slate-700 transition-colors text-xs sm:text-sm font-medium">
                  <Download size={16} className="rotate-180" />
                  <span className="hidden xs:inline">{t('import')}</span>
                  <input type="file" accept=".xlsx,.xls,.ods" className="hidden" onChange={handleImport} />
                </label>
                <button onClick={handleExport} className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:hover:bg-slate-700 transition-colors text-xs sm:text-sm font-medium">
                  <Download size={16} />
                  <span className="hidden xs:inline">{t('export')}</span>
                </button>
                <button onClick={onBackup} className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:hover:bg-indigo-900/50 transition-colors text-xs sm:text-sm font-medium border border-indigo-100 dark:border-indigo-900/50">
                  <ShieldCheck size={16} />
                  <span className="hidden xs:inline">{t('backup_data')}</span>
                </button>
              </>
            )}
            <Button size="sm" onClick={onNew} className="px-2 sm:px-3 py-1.5 sm:py-2">
              <Plus size={18} /> 
              <span className="hidden xs:inline">{t('new')}</span>
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder={t('search')} 
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {filtered.map(report => (
          <Card key={report.id} onClick={() => onSelect(report)} className="flex flex-col gap-2 p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
              <div className="flex items-center gap-3">
                {report.company_logo && (
                  <img src={report.company_logo} alt="Logo" className="w-8 h-8 object-contain rounded-lg border border-slate-100 dark:border-slate-800 bg-white p-0.5" />
                )}
                <span className="font-bold text-indigo-600 dark:text-indigo-400 break-words max-w-full">{report.client_name}</span>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="text-[10px] sm:text-xs text-slate-500 whitespace-nowrap">
                  {report.date ? format(parseISO(report.date), 'dd MMM yyyy', { locale: it }) : 'Data non definita'}
                </span>
                <div className="flex gap-1">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(report);
                    }}
                    className="p-1.5 sm:p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors"
                    title="Modifica Rapportino"
                  >
                    <Pencil size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(report.id);
                    }}
                    className="p-1.5 sm:p-2 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl transition-colors border border-transparent hover:border-rose-200 dark:hover:border-rose-800"
                    title="Elimina Rapportino"
                  >
                    <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
              <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-1.5">
                ({report.days?.reduce((acc, d) => acc + d.work_hours, 0) || 0}h L / {report.days?.reduce((acc, d) => acc + d.travel_hours, 0) || 0}h V)
              </span>
              {report.description}
            </p>
            <div className="flex items-center gap-4 mt-1 flex-wrap">
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Clock size={14} /> {report.days?.reduce((acc, d) => acc + d.work_hours, 0) || 0}h lavoro / {report.days?.reduce((acc, d) => acc + d.travel_hours, 0) || 0}h viaggio
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <User size={14} /> {report.technician_name}
              </div>
              {report.items && report.items.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Package size={14} /> {report.items.reduce((acc, i) => acc + i.quantity, 0)} articoli
                </div>
              )}
              {report.days && report.days.some(d => d.meals > 0) && (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Utensils size={14} /> {report.days.reduce((acc, d) => acc + (d.meals || 0), 0)}
                </div>
              )}
              {report.days && report.days.some(d => d.overnight) && (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Bed size={14} /> {report.days.filter(d => d.overnight).length}
                </div>
              )}
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <FileText size={48} strokeWidth={1} />
            <p className="mt-2">Nessun rapportino trovato</p>
          </div>
        )}
      </div>
    </div>
  );
};
