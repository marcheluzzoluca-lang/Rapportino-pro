import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Download, 
  Search, 
  Pencil, 
  MapPin, 
  Phone, 
  User, 
  QrCode, 
  Calendar as CalendarIcon, 
  ArrowRight, 
  Mail,
  Building2
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { Html5QrcodeScanner } from "html5-qrcode";
import { Client, Technician, Article, Company } from '../types';
import { translations, Language } from '../translations';
import { Button, Card } from './UI';
import { cn } from '../types';
import { downloadFile } from '../utils';

export const ClientsList = ({ 
  clients, 
  onNew, 
  onEdit, 
  onDelete, 
  onDeleteAll, 
  currentUser, 
  language,
  setAlertConfig,
  setConfirmConfig
}: { 
  clients: Client[], 
  onNew: () => void, 
  onEdit: (c: Client) => void, 
  onDelete: (id: number) => void, 
  onDeleteAll: () => void, 
  currentUser: any, 
  language: Language,
  setAlertConfig: (config: any) => void,
  setConfirmConfig: (config: any) => void
}) => {
  const t = (key: keyof typeof translations['it']) => translations[language][key];
  const [search, setSearch] = useState('');
  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const handleExport = async () => {
    try {
      await downloadFile(`/api/export/clients?lang=${language}`, 'clienti.xlsx');
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
          const res = await fetch('/api/import/clients', {
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
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 flex flex-col gap-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold">{t('clients')}</h1>
          <div className="flex gap-2 flex-wrap">
            {currentUser?.type === 'admin' && (
              <>
                <button 
                  onClick={onDeleteAll}
                  className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:hover:bg-rose-900/50 transition-colors text-xs sm:text-sm font-medium border border-rose-100 dark:border-rose-900/50"
                >
                  <Trash2 size={16} />
                  <span className="hidden xs:inline">{t('delete_all_clients')}</span>
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
        {filtered.map(client => (
          <Card key={client.id} className="flex flex-col gap-3 p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
              <span className="font-bold text-base sm:text-lg break-words max-w-full">{client.name}</span>
              <div className="flex gap-1 self-end sm:self-auto">
                <button onClick={() => onEdit(client)} className="p-1.5 sm:p-2 text-slate-400 hover:text-indigo-500">
                  <Pencil size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
                <button onClick={() => onDelete(client.id)} className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-500">
                  <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-indigo-600 transition-colors"
                >
                  <MapPin size={14} /> {client.address}
                </a>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                  {client.km} KM
                </span>
                <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400">
                  <Phone size={14} /> {client.phone}
                </a>
              </div>
              {client.machines && client.machines.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {client.machines.map((m, i) => (
                    <span key={i} className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">
                      {m.brand} {m.type} ({m.serial_number})
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export const TechniciansList = ({ 
  technicians, 
  onNew, 
  onEdit, 
  onDelete, 
  onDeleteAll,
  onOpenCalendar, 
  currentUser, 
  language,
  setAlertConfig,
  setConfirmConfig
}: { 
  technicians: Technician[], 
  onNew: () => void, 
  onEdit: (t: Technician) => void, 
  onDelete: (id: number) => void, 
  onDeleteAll: () => void,
  onOpenCalendar: (t: Technician) => void, 
  currentUser: any, 
  language: Language,
  setAlertConfig: (config: any) => void,
  setConfirmConfig: (config: any) => void
}) => {
  const t = (key: keyof typeof translations['it']) => translations[language][key];
  const [selectedTechQR, setSelectedTechQR] = useState<Technician | null>(null);
  const filteredTechnicians = currentUser?.type === 'technician' 
    ? technicians.filter(t => t.id === currentUser.id)
    : technicians;

  const handleExport = async () => {
    try {
      await downloadFile(`/api/export/technicians?lang=${language}`, 'tecnici.xlsx');
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
          const res = await fetch('/api/import/technicians', {
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
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 flex items-center justify-between gap-2 flex-wrap border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl sm:text-2xl font-bold">{t('technicians')}</h1>
        {currentUser?.type === 'admin' && (
          <div className="flex gap-2 flex-wrap">
            <label className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-100 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-200 dark:hover:hover:bg-slate-700 transition-colors text-xs sm:text-sm font-medium">
              <Download size={16} className="rotate-180" />
              <span className="hidden xs:inline">{t('import')}</span>
              <input type="file" accept=".xlsx,.xls,.ods" className="hidden" onChange={handleImport} />
            </label>
            <button onClick={handleExport} className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:hover:bg-slate-700 transition-colors text-xs sm:text-sm font-medium">
              <Download size={16} />
              <span className="hidden xs:inline">{t('export')}</span>
            </button>
            <button onClick={onDeleteAll} className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-xs sm:text-sm font-medium">
              <Trash2 size={16} />
              <span className="hidden xs:inline">{t('delete_all_technicians')}</span>
            </button>
            <Button size="sm" onClick={onNew} className="px-2 sm:px-3 py-1.5 sm:py-2">
              <Plus size={18} /> 
              <span className="hidden xs:inline">{t('new')}</span>
            </Button>
          </div>
        )}
      </header>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {filteredTechnicians.map(tech => (
          <Card key={tech.id} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                  <User size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold">{tech.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{tech.specialization}</span>
                    {tech.code && currentUser?.type === 'admin' && <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-slate-400">Cod: {tech.code}</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setSelectedTechQR(tech)} className="p-2 text-slate-400 hover:text-indigo-500" title="QR Code">
                  <QrCode size={18} />
                </button>
                <button onClick={() => onOpenCalendar(tech)} className="p-2 text-slate-400 hover:text-indigo-500" title="Calendario">
                  <CalendarIcon size={18} />
                </button>
                {currentUser?.type === 'admin' && (
                  <>
                    <button onClick={() => onEdit(tech)} className="p-2 text-slate-400 hover:text-indigo-500">
                      <ArrowRight size={18} />
                    </button>
                    <button onClick={() => onDelete(tech.id)} className="p-2 text-slate-400 hover:text-rose-500">
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2"><Phone size={14} /> {tech.phone}</div>
              <div className="flex items-center gap-2"><Mail size={14} /> {tech.email}</div>
            </div>
          </Card>
        ))}
      </div>

      {selectedTechQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedTechQR(null)}>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl max-w-sm w-full flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold">{selectedTechQR.name}</h3>
            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <QRCode value={JSON.stringify({
                id: selectedTechQR.id,
                name: selectedTechQR.name,
                phone: selectedTechQR.phone,
                email: selectedTechQR.email,
                specialization: selectedTechQR.specialization
              })} size={200} />
            </div>
            <p className="text-sm text-slate-500 text-center">Scansiona per info tecnico</p>
            <Button variant="secondary" onClick={() => setSelectedTechQR(null)} className="w-full">Chiudi</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export const ArticlesList = ({ 
  articles, 
  onNew, 
  onEdit, 
  onScan, 
  onDelete, 
  onDeleteAll, 
  currentUser, 
  language,
  setConfirmConfig,
  setAlertConfig
}: { 
  articles: Article[], 
  onNew: () => void, 
  onEdit: (a: Article) => void, 
  onScan: (a: Article) => void, 
  onDelete: (id: number) => void, 
  onDeleteAll: () => void, 
  currentUser: any, 
  language: Language,
  setConfirmConfig: (config: any) => void,
  setAlertConfig: (config: any) => void
}) => {
  const t = (key: keyof typeof translations['it']) => translations[language][key];
  const [search, setSearch] = useState('');
  const [selectedArticleQR, setSelectedArticleQR] = useState<Article | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const filteredArticles = articles.filter(a => 
    a.code.toLowerCase().includes(search.toLowerCase()) || 
    a.description.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (isScanning) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );
      scanner.render((decodedText) => {
        try {
          const data = JSON.parse(decodedText);
          if (data.code && data.description) {
            scanner.clear();
            setIsScanning(false);
            // Check if article exists
            const existing = articles.find(a => a.code === data.code);
            if (existing) {
              setConfirmConfig({
                isOpen: true,
                title: t('article_exists'),
                message: translations[language]['article_exists_edit'],
                onConfirm: () => {
                  onEdit(existing);
                  setConfirmConfig(null);
                }
              });
            } else {
              onScan({ id: 0, code: data.code, description: data.description });
            }
          }
        } catch (e) {
          console.error("Invalid QR Code", e);
          setAlertConfig({
            isOpen: true,
            title: translations[language]['error'],
            message: translations[language]['invalid_qr']
          });
        }
      }, (error) => {
        // console.warn(error);
      });

      return () => {
        scanner.clear().catch(console.error);
      };
    }
  }, [isScanning, articles, language, onEdit, onScan, setAlertConfig, setConfirmConfig, t]);

  const handleExport = async () => {
    try {
      await downloadFile(`/api/export/articles?lang=${language}`, 'articoli.xlsx');
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
          const res = await fetch('/api/import/articles', {
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
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 flex items-center justify-between gap-2 flex-wrap border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl sm:text-2xl font-bold">{t('articles')}</h1>
        <div className="flex gap-2 flex-wrap">
          {currentUser?.type === 'admin' && (
            <>
              <button 
                onClick={onDeleteAll}
                className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:hover:bg-rose-900/50 transition-colors text-xs sm:text-sm font-medium border border-rose-100 dark:border-rose-900/50"
              >
                <Trash2 size={16} />
                <span className="hidden xs:inline">{t('delete_all_articles')}</span>
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
            </>
          )}
          <Button size="sm" onClick={onNew} className="px-2 sm:px-3 py-1.5 sm:py-2">
            <Plus size={18} /> 
            <span className="hidden xs:inline">{t('new')}</span>
          </Button>
        </div>
      </header>

      {isScanning && (
        <div className="p-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div id="reader" className="w-full max-w-sm mx-auto"></div>
          <div className="flex justify-center mt-2">
            <Button variant="secondary" onClick={() => setIsScanning(false)}>{t('cancel')}</Button>
          </div>
        </div>
      )}

      <div className="px-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder={t('search_article')} 
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button 
            onClick={() => setIsScanning(!isScanning)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-500 bg-slate-100 dark:bg-slate-800 rounded-lg"
            title="Scan QR"
          >
            <QrCode size={18} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {filteredArticles.map(article => (
          <Card key={article.id} className="flex flex-col gap-1 p-3 sm:p-4">
            <div className="flex justify-between items-start gap-2">
              <span className="font-bold text-indigo-600 dark:text-indigo-400 break-all">{article.code}</span>
              <div className="flex gap-1">
                <button onClick={() => setSelectedArticleQR(article)} className="p-1.5 sm:p-2 text-slate-400 hover:text-indigo-500" title="QR Code">
                  <QrCode size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
                <button onClick={() => onEdit(article)} className="p-1.5 sm:p-2 text-slate-400 hover:text-indigo-500">
                  <Pencil size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
                <button onClick={() => onDelete(article.id)} className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-500">
                  <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 break-words">{article.description}</p>
            {currentUser?.type === 'admin' && (
              <div className="flex gap-4 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400">{t('price')}</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">€ {article.price?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400">{t('stock')}</span>
                  <span className={cn(
                    "text-sm font-medium",
                    (article.stock || 0) <= 0 ? "text-rose-500" : "text-emerald-500"
                  )}>
                    {article.stock || 0}
                  </span>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {selectedArticleQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedArticleQR(null)}>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl max-w-sm w-full flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold">{selectedArticleQR.code}</h3>
            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <QRCode value={JSON.stringify({
                code: selectedArticleQR.code,
                description: selectedArticleQR.description
              })} size={200} />
            </div>
            <p className="text-sm text-slate-500 text-center">{selectedArticleQR.description}</p>
            <Button variant="secondary" onClick={() => setSelectedArticleQR(null)} className="w-full">Chiudi</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export const CompaniesList = ({ 
  companies, 
  onNew, 
  onEdit, 
  onDelete, 
  language, 
  setConfirmConfig,
  setAlertConfig
}: { 
  companies: Company[], 
  onNew: () => void, 
  onEdit: (c: Company) => void, 
  onDelete: (id: number) => void, 
  language: Language, 
  setConfirmConfig: (config: any) => void,
  setAlertConfig: (config: any) => void
}) => {
  const t = (key: keyof typeof translations['it']) => translations[language][key];
  
  const handleExport = async () => {
    try {
      await downloadFile(`/api/export/companies?lang=${language}`, 'aziende.xlsx');
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
          const res = await fetch('/api/import/companies', {
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
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase text-slate-400 tracking-wider ml-1">{t('companies')}</h2>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs font-medium">
            <Download size={14} className="rotate-180" />
            <span className="hidden xs:inline">{t('import')}</span>
            <input type="file" accept=".xlsx,.xls,.ods" className="hidden" onChange={handleImport} />
          </label>
          <button onClick={handleExport} className="flex items-center gap-2 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs font-medium">
            <Download size={14} />
            <span className="hidden xs:inline">{t('export')}</span>
          </button>
          <Button size="sm" onClick={onNew} className="px-2 py-1 h-8">
            <Plus size={16} />
            <span className="hidden xs:inline ml-1">{t('new')}</span>
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {companies.map(company => (
          <div key={company.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {company.logo ? (
                <img src={company.logo} alt={company.name} className="h-10 w-10 object-contain rounded bg-white border border-slate-100 dark:border-slate-800" />
              ) : (
                <div className="h-10 w-10 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <Building2 size={20} />
                </div>
              )}
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{company.name}</p>
                <p className="text-xs text-slate-500">{company.vat}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => onEdit(company)} className="p-2 text-slate-400 hover:text-indigo-500 transition-colors">
                <Pencil size={18} />
              </button>
              <button onClick={() => onDelete(company.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        {companies.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            {t('no_data')}
          </div>
        )}
      </div>
    </div>
  );
};
