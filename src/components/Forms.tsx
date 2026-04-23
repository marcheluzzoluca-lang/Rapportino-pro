import React, { useState } from 'react';
import { 
  ChevronLeft, 
  Save
} from 'lucide-react';
import { Technician, Article, Company } from '../types';
import { translations, Language } from '../translations';
import { Button, Input } from './UI';

export const TechnicianForm = ({ 
  technician, 
  onSave, 
  onBack, 
  language,
  setAlertConfig
}: { 
  technician?: Technician | null, 
  onSave: (data: any) => void, 
  onBack: () => void, 
  language: Language,
  setAlertConfig: (config: any) => void
}) => {
  const t = (key: keyof typeof translations['it']) => translations[language][key];
  const [formData, setFormData] = useState({
    name: technician?.name || '',
    specialization: technician?.specialization || '',
    phone: technician?.phone || '',
    email: technician?.email || '',
    notes: technician?.notes || '',
    code: technician?.code || ''
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <header className="p-4 flex items-center gap-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">{technician ? t('edit_technician') : t('new_technician')}</h1>
      </header>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <Input label={t('name')} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
        <Input label={t('access_code')} value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="Codice per visualizzare i propri rapportini" />
        <Input label={t('specialization')} value={formData.specialization} onChange={e => setFormData({ ...formData, specialization: e.target.value })} />
        <Input label={t('phone')} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
        <Input label={t('email')} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
        <Input label={t('notes')} type="textarea" rows={4} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
      </div>
      <footer className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 safe-area-bottom">
        <Button className="w-full" size="lg" onClick={() => onSave(formData)}>
          <Save size={20} /> {t('save_technician')}
        </Button>
      </footer>
    </div>
  );
};

export const ArticleForm = ({ 
  article, 
  onSave, 
  onBack, 
  language,
  currentUser,
  setAlertConfig
}: { 
  article?: Article | null, 
  onSave: (data: any) => void, 
  onBack: () => void, 
  language: Language,
  currentUser: any,
  setAlertConfig: (config: any) => void
}) => {
  const t = (key: keyof typeof translations['it']) => translations[language][key];
  const [formData, setFormData] = useState({ 
    code: article?.code || '', 
    description: article?.description || '',
    price: article?.price || 0,
    stock: article?.stock || 0
  });
  const isAdmin = currentUser?.type === 'admin';

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <header className="p-4 flex items-center gap-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">{article ? t('edit_article') : t('new_article')}</h1>
      </header>
      <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
        <Input label={t('code')} value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} />
        <Input label={t('description')} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
        
        {isAdmin && (
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label={t('price')} 
              type="number" 
              step="0.01"
              value={formData.price} 
              onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} 
            />
            <Input 
              label={t('stock')} 
              type="number" 
              value={formData.stock} 
              onChange={e => setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })} 
            />
          </div>
        )}
      </div>
      <footer className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 safe-area-bottom">
        <Button className="w-full" size="lg" onClick={() => onSave(formData)}>
          <Save size={20} /> {t('save_article')}
        </Button>
      </footer>
    </div>
  );
};

export const CompanyForm = ({ 
  company, 
  onSave, 
  onBack, 
  language,
  setAlertConfig
}: { 
  company: Company | null, 
  onSave: (c: Company) => void, 
  onBack: () => void, 
  language: Language,
  setAlertConfig: (config: any) => void
}) => {
  const t = (key: keyof typeof translations['it']) => translations[language][key];
  const [formData, setFormData] = useState<Partial<Company>>(company || {
    name: '', address: '', phone: '', vat: '', email: '', logo: ''
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <ChevronLeft size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">{company ? t('edit_company') : t('new_company')}</h1>
        </div>
        <Button size="sm" onClick={() => onSave(formData as Company)} disabled={!formData.name}>
          <Save size={18} />
          <span>{t('save')}</span>
        </Button>
      </header>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase text-slate-400">{t('logo')}</label>
            <div className="flex items-center gap-4">
              {formData.logo && (
                <img src={formData.logo} alt="Logo" className="h-16 w-16 object-contain border border-slate-100 dark:border-slate-800 rounded-lg bg-white" />
              )}
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase text-slate-400">{t('name')}</label>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-indigo-500" placeholder={t('company_name_placeholder')} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase text-slate-400">{t('vat')}</label>
              <input type="text" value={formData.vat} onChange={e => setFormData({...formData, vat: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-indigo-500" placeholder={t('vat_placeholder')} />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-bold uppercase text-slate-400">{t('address')}</label>
              <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-indigo-500" placeholder={t('address_placeholder')} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase text-slate-400">{t('phone')}</label>
              <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-indigo-500" placeholder={t('phone_placeholder')} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase text-slate-400">{t('email')}</label>
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-indigo-500" placeholder={t('email_placeholder')} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
