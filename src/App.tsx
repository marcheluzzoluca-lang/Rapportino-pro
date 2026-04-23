import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Settings as SettingsIcon, 
  User, 
  Package,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, Client, Technician, Article, Report, DashboardData, Company } from './types';
import { translations, Language } from './translations';
import { 
  ConfirmModal, 
  AlertModal, 
  TabButton 
} from './components/UI';
import { LoginScreen } from './components/LoginScreen';
import { Dashboard } from './components/Dashboard';
import { ReportsList } from './components/ReportsList';
import { ReportForm } from './components/ReportForm';
import { ReportDetail } from './components/ReportDetail';
import { ClientsList } from './components/Lists';
import { ClientForm } from './components/ClientForm';
import { TechniciansList, ArticlesList } from './components/Lists';
import { TechnicianForm, ArticleForm, CompanyForm } from './components/Forms';
import { TechnicianCalendar } from './components/TechnicianCalendar';
import { Settings } from './components/Settings';

export default function App() {
  useEffect(() => {
    console.log("App version 1.0.1 loaded");
  }, []);

  const [currentUser, setCurrentUser] = useState<{ type: 'admin' | 'technician', id?: number, name?: string } | null>(() => {
    try {
      const saved = localStorage.getItem('rapportini_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.warn("Failed to load user from localStorage", e);
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDark, setIsDark] = useState(false);
  const [language, setLanguage] = useState<Language>('it');
  const [view, setView] = useState<'main' | 'report-form' | 'report-detail' | 'client-form' | 'tech-form' | 'article-form' | 'technicians' | 'articles' | 'calendar' | 'company-form'>('main');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void | Promise<void> } | null>(null);
  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean, title: string, message: string } | null>(null);
  
  const [data, setData] = useState<DashboardData | null>(() => {
    try {
      const saved = localStorage.getItem('rapportini_data');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.warn("Failed to load data from localStorage", e);
      return null;
    }
  });
  const [reports, setReports] = useState<Report[]>(() => {
    try {
      const saved = localStorage.getItem('rapportini_reports');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn("Failed to load reports from localStorage", e);
      return [];
    }
  });
  const [clients, setClients] = useState<Client[]>(() => {
    try {
      const saved = localStorage.getItem('rapportini_clients');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn("Failed to load clients from localStorage", e);
      return [];
    }
  });
  const [technicians, setTechnicians] = useState<Technician[]>(() => {
    try {
      const saved = localStorage.getItem('rapportini_technicians');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn("Failed to load technicians from localStorage", e);
      return [];
    }
  });
  const [articles, setArticles] = useState<Article[]>(() => {
    try {
      const saved = localStorage.getItem('rapportini_articles');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn("Failed to load articles from localStorage", e);
      return [];
    }
  });
  const [companies, setCompanies] = useState<Company[]>(() => {
    try {
      const saved = localStorage.getItem('rapportini_companies');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn("Failed to load companies from localStorage", e);
      return [];
    }
  });
  const [settings, setSettings] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('rapportini_settings');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.warn("Failed to load settings from localStorage", e);
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('rapportini_data', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    localStorage.setItem('rapportini_reports', JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    localStorage.setItem('rapportini_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('rapportini_technicians', JSON.stringify(technicians));
  }, [technicians]);

  useEffect(() => {
    localStorage.setItem('rapportini_articles', JSON.stringify(articles));
  }, [articles]);

  useEffect(() => {
    localStorage.setItem('rapportini_companies', JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    localStorage.setItem('rapportini_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    fetchData();
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const fetchData = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    
    const dashboardUrl = currentUser?.type === 'technician' && currentUser.id 
      ? `/api/dashboard?technicianId=${currentUser.id}` 
      : '/api/dashboard';

    const fetchSafe = async (url: string, fallback: any) => {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (e) {
        console.warn(`Fetch failed for ${url}:`, e);
        return fallback;
      }
    };

    try {
      const [dbData, r, c, t, a, s, co] = await Promise.all([
        fetchSafe(dashboardUrl, null),
        fetchSafe('/api/reports', null),
        fetchSafe('/api/clients', null),
        fetchSafe('/api/technicians', null),
        fetchSafe('/api/articles', null),
        fetchSafe('/api/settings', null),
        fetchSafe('/api/companies', null),
      ]);

      if (dbData) setData(dbData);
      
      if (r !== null && Array.isArray(r)) {
        let serverReports = r;
        if (currentUser?.type === 'technician' && currentUser.id) {
          serverReports = r.filter((report: any) => Number(report.technician_id) === Number(currentUser.id));
        }
        
        setReports(serverReports.sort((a: any, b: any) => {
          const dateA = a.date || (a.days && a.days[0]?.date) || '';
          const dateB = b.date || (b.days && b.days[0]?.date) || '';
          return dateB.localeCompare(dateA);
        }));
      }
      
      if (c !== null) {
        setClients(c.sort((a: any, b: any) => a.name.localeCompare(b.name)));
      }
      if (t !== null) {
        setTechnicians(t.sort((a: any, b: any) => a.name.localeCompare(b.name)));
      }
      if (a !== null) {
        setArticles(a.sort((a: any, b: any) => a.code.localeCompare(b.code)));
      }
      if (s !== null) {
        setSettings(prev => ({ ...prev, ...s }));
      }
      if (co !== null) {
        setCompanies(co);
      }
      
    } catch (err) {
      console.error('Error in fetchData:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = (user: any) => {
    setCurrentUser(user);
    localStorage.setItem('rapportini_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('rapportini_user');
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update setting');
      }
      await fetchData();
    } catch (e) {
      console.error(e);
      setAlertConfig({
        isOpen: true,
        title: translations[language]['error'],
        message: (e as Error).message || 'Failed to update setting'
      });
    }
  };

  const saveReport = async (reportData: any) => {
    if (isSaving) return;
    setIsSaving(true);
    
    try {
      const url = editingReport ? `/api/reports/${editingReport.id}` : '/api/reports';
      const method = editingReport ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error saving report');
      }
      
      await fetchData();
      setView('main');
      setEditingReport(null);
      setActiveTab('reports');
    } catch (err) {
      console.error('Save report error:', err);
      setAlertConfig({
        isOpen: true,
        title: translations[language]['error'],
        message: (err as Error).message || translations[language]['error_saving_report']
      });
    } finally {
      setIsSaving(false);
    }
  };

  const saveClient = async (clientData: any) => {
    try {
      const url = editingClient ? `/api/clients/${editingClient.id}` : '/api/clients';
      const method = editingClient ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error saving client');
      }
      
      await fetchData();
      setView('main');
      setEditingClient(null);
    } catch (err) {
      console.error('Save client error:', err);
      setAlertConfig({
        isOpen: true,
        title: translations[language]['error'],
        message: (err as Error).message || 'Error saving client'
      });
    }
  };

  const deleteClient = async (id: number) => {
    setConfirmConfig({
      isOpen: true,
      title: translations[language]['delete_client'],
      message: translations[language]['confirm_delete_client'],
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to delete client');
          }
          await fetchData();
          setConfirmConfig(null);
        } catch (err) {
          console.error(err);
          setAlertConfig({
            isOpen: true,
            title: translations[language]['error'],
            message: (err as Error).message
          });
          setConfirmConfig(null);
        }
      }
    });
  };

  const deleteAllClients = async () => {
    setConfirmConfig({
      isOpen: true,
      title: translations[language]['delete_all_clients'],
      message: translations[language]['confirm_delete_all_clients'],
      onConfirm: async () => {
        try {
          const res = await fetch('/api/clients', { method: 'DELETE' });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to delete all clients');
          }
          await fetchData();
          setConfirmConfig(null);
        } catch (err) {
          console.error(err);
          setAlertConfig({
            isOpen: true,
            title: translations[language]['error'],
            message: (err as Error).message
          });
          setConfirmConfig(null);
        }
      }
    });
  };

  const saveTechnician = async (techData: any) => {
    try {
      const url = editingTechnician ? `/api/technicians/${editingTechnician.id}` : '/api/technicians';
      const method = editingTechnician ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(techData)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error saving technician');
      }
      
      await fetchData();
      setView('main');
      setEditingTechnician(null);
    } catch (err) {
      console.error('Save technician error:', err);
      setAlertConfig({
        isOpen: true,
        title: translations[language]['error'],
        message: (err as Error).message || 'Error saving technician'
      });
    }
  };

  const deleteTechnician = async (id: number) => {
    setConfirmConfig({
      isOpen: true,
      title: translations[language]['delete_technician'],
      message: translations[language]['confirm_delete_technician'],
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/technicians/${id}`, { method: 'DELETE' });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to delete technician');
          }
          await fetchData();
          setConfirmConfig(null);
        } catch (err) {
          console.error(err);
          setAlertConfig({
            isOpen: true,
            title: translations[language]['error'],
            message: (err as Error).message
          });
          setConfirmConfig(null);
        }
      }
    });
  };

  const deleteAllTechnicians = async () => {
    setConfirmConfig({
      isOpen: true,
      title: translations[language]['delete_all_technicians'],
      message: translations[language]['confirm_delete_all_technicians'],
      onConfirm: async () => {
        try {
          const res = await fetch('/api/technicians', { method: 'DELETE' });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to delete all technicians');
          }
          await fetchData();
          setConfirmConfig(null);
        } catch (err) {
          console.error(err);
          setAlertConfig({
            isOpen: true,
            title: translations[language]['error'],
            message: (err as Error).message
          });
          setConfirmConfig(null);
        }
      }
    });
  };

  const saveArticle = async (articleData: any) => {
    try {
      const url = editingArticle ? `/api/articles/${editingArticle.id}` : '/api/articles';
      const method = editingArticle ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(articleData)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error saving article');
      }
      
      await fetchData();
      setView('main');
      setEditingArticle(null);
    } catch (err) {
      console.error('Save article error:', err);
      setAlertConfig({
        isOpen: true,
        title: translations[language]['error'],
        message: (err as Error).message || 'Error saving article'
      });
    }
  };

  const deleteArticle = async (id: number) => {
    setConfirmConfig({
      isOpen: true,
      title: translations[language]['delete_article'],
      message: translations[language]['confirm_delete_article'],
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/articles/${id}`, { method: 'DELETE' });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to delete article');
          }
          await fetchData();
          setConfirmConfig(null);
        } catch (err) {
          console.error(err);
          setAlertConfig({
            isOpen: true,
            title: translations[language]['error'],
            message: (err as Error).message
          });
          setConfirmConfig(null);
        }
      }
    });
  };

  const deleteAllArticles = async () => {
    setConfirmConfig({
      isOpen: true,
      title: translations[language]['delete_all_articles'],
      message: translations[language]['confirm_delete_all_articles'],
      onConfirm: async () => {
        try {
          const res = await fetch('/api/articles', { method: 'DELETE' });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to delete all articles');
          }
          await fetchData();
          setConfirmConfig(null);
        } catch (err) {
          console.error(err);
          setAlertConfig({
            isOpen: true,
            title: translations[language]['error'],
            message: (err as Error).message
          });
          setConfirmConfig(null);
        }
      }
    });
  };

  const saveCompany = async (companyData: Company) => {
    try {
      const url = editingCompany ? `/api/companies/${editingCompany.id}` : '/api/companies';
      const method = editingCompany ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyData)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error saving company');
      }
      
      await fetchData();
      setView('main');
      setEditingCompany(null);
    } catch (err) {
      console.error('Save company error:', err);
      setAlertConfig({
        isOpen: true,
        title: translations[language]['error'],
        message: (err as Error).message || 'Error saving company'
      });
    }
  };

  const deleteCompany = async (id: number) => {
    setConfirmConfig({
      isOpen: true,
      title: translations[language]['delete_company'],
      message: translations[language]['confirm_delete_company'],
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/companies/${id}`, { method: 'DELETE' });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to delete company');
          }
          await fetchData();
          setConfirmConfig(null);
        } catch (err) {
          console.error(err);
          setAlertConfig({
            isOpen: true,
            title: translations[language]['error'],
            message: (err as Error).message
          });
          setConfirmConfig(null);
        }
      }
    });
  };

  const deleteAllReports = async () => {
    setConfirmConfig({
      isOpen: true,
      title: translations[language]['delete_all_reports'],
      message: translations[language]['confirm_delete_all_reports'],
      onConfirm: async () => {
        try {
          const res = await fetch('/api/reports', { method: 'DELETE' });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to delete all reports');
          }
          await fetchData();
          setConfirmConfig(null);
        } catch (err) {
          console.error(err);
          setAlertConfig({
            isOpen: true,
            title: translations[language]['error'],
            message: (err as Error).message
          });
          setConfirmConfig(null);
        }
      }
    });
  };

  const deleteReport = async (id: number) => {
    setConfirmConfig({
      isOpen: true,
      title: translations[language]['delete_report'],
      message: translations[language]['confirm_delete_report'],
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to delete report');
          }
          await fetchData();
          setView('main');
          setSelectedReport(null);
          setConfirmConfig(null);
        } catch (err) {
          console.error(err);
          setAlertConfig({
            isOpen: true,
            title: translations[language]['error'],
            message: (err as Error).message
          });
          setConfirmConfig(null);
        }
      }
    });
  };

  const handleBackup = () => {
    const backupData = {
      reports,
      clients,
      technicians,
      articles,
      companies,
      settings,
      data,
      version: '1.0.0',
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapportini_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleRestore = (backupData: any) => {
    setConfirmConfig({
      isOpen: true,
      title: translations[language]['restore_backup'],
      message: translations[language]['confirm_restore'],
      onConfirm: async () => {
        try {
          const res = await fetch('/api/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(backupData)
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to restore backup');
          }
          await fetchData();
          setConfirmConfig(null);
        } catch (err) {
          console.error(err);
          setAlertConfig({
            isOpen: true,
            title: translations[language]['error'],
            message: (err as Error).message || 'Failed to restore backup'
          });
          setConfirmConfig(null);
        }
      }
    });
  };

  const resetData = async () => {
    setConfirmConfig({
      isOpen: true,
      title: translations[language]['reset_total'],
      message: translations[language]['confirm_reset'],
      onConfirm: async () => {
        try {
          const res = await fetch('/api/reset-data', { method: 'POST' });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to reset data');
          }
          handleLogout();
          window.location.reload();
        } catch (err) {
          console.error(err);
          setAlertConfig({
            isOpen: true,
            title: translations[language]['error'],
            message: (err as Error).message || 'Failed to reset data'
          });
          setConfirmConfig(null);
        }
      }
    });
  };

  const renderContent = () => {
    if (!currentUser) {
      return <LoginScreen onLogin={handleLogin} settings={settings} technicians={technicians} language={language} setAlertConfig={setAlertConfig} />;
    }
    if (view === 'report-form') {
      return <ReportForm 
        clients={clients} 
        technicians={technicians} 
        articles={articles} 
        companies={companies}
        report={editingReport}
        currentUser={currentUser}
        onSave={saveReport} 
        onBack={() => { setView('main'); setEditingReport(null); }} 
        language={language}
        isSaving={isSaving}
        setAlertConfig={setAlertConfig}
        refreshData={fetchData}
      />;
    }
    if (view === 'report-detail' && selectedReport) {
      return <ReportDetail report={selectedReport} settings={settings} onBack={() => setView('main')} onEdit={(r) => { setEditingReport(r); setView('report-form'); }} onDelete={deleteReport} language={language} setAlertConfig={setAlertConfig} />;
    }
    if (view === 'client-form') {
      return <ClientForm client={editingClient} onSave={saveClient} onBack={() => { setView('main'); setEditingClient(null); }} language={language} setAlertConfig={setAlertConfig} />;
    }
    if (view === 'tech-form') {
      return <TechnicianForm technician={editingTechnician} onSave={saveTechnician} onBack={() => { setView('main'); setEditingTechnician(null); }} language={language} setAlertConfig={setAlertConfig} />;
    }
    if (view === 'calendar' && selectedTechnician) {
      return <TechnicianCalendar 
        technician={selectedTechnician} 
        onBack={() => { setView('main'); setSelectedTechnician(null); }} 
        language={language} 
        reports={reports}
        setConfirmConfig={setConfirmConfig}
        setAlertConfig={setAlertConfig}
      />;
    }
    if (view === 'article-form') {
      return <ArticleForm article={editingArticle} onSave={saveArticle} onBack={() => { setView('main'); setEditingArticle(null); }} language={language} currentUser={currentUser} setAlertConfig={setAlertConfig} />;
    }
    if (view === 'company-form') {
      return <CompanyForm company={editingCompany} onSave={saveCompany} onBack={() => { setView('main'); setEditingCompany(null); setActiveTab('settings'); }} language={language} setAlertConfig={setAlertConfig} />;
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard 
        data={data} 
        reports={reports}
        clients={clients}
        articles={articles}
        currentUser={currentUser} 
        technicians={technicians} 
        onNavigate={(tab) => {
          if (tab === 'report-form') setView('report-form');
          else setActiveTab(tab);
        }} 
        language={language} 
        setLanguage={setLanguage}
        setConfirmConfig={setConfirmConfig}
        setAlertConfig={setAlertConfig}
      />;
      case 'reports': return <ReportsList 
        reports={reports} 
        onNew={() => setView('report-form')} 
        onSelect={(r) => {
          setSelectedReport(r);
          setView('report-detail');
        }} 
        onDelete={deleteReport}
        onDeleteAll={deleteAllReports}
        onBackup={handleBackup}
        currentUser={currentUser}
        language={language}
        setAlertConfig={setAlertConfig}
      />;
      case 'clients': return <ClientsList 
        clients={clients} 
        onNew={() => setView('client-form')} 
        onEdit={(c) => { setEditingClient(c); setView('client-form'); }} 
        onDelete={deleteClient} 
        onDeleteAll={deleteAllClients}
        currentUser={currentUser}
        language={language}
        setAlertConfig={setAlertConfig}
        setConfirmConfig={setConfirmConfig}
      />;
      case 'technicians': return <TechniciansList 
        technicians={technicians} 
        onNew={() => setView('tech-form')} 
        onEdit={(t) => { setEditingTechnician(t); setView('tech-form'); }}
        onDelete={deleteTechnician} 
        onDeleteAll={deleteAllTechnicians}
        onOpenCalendar={(t) => { setSelectedTechnician(t); setView('calendar'); }}
        currentUser={currentUser}
        language={language}
        setAlertConfig={setAlertConfig}
        setConfirmConfig={setConfirmConfig}
      />;
      case 'articles': return <ArticlesList 
        articles={articles} 
        onNew={() => setView('article-form')} 
        onEdit={(a) => { setEditingArticle(a); setView('article-form'); }}
        onScan={(a) => { setEditingArticle(a); setView('article-form'); }}
        onDelete={deleteArticle} 
        onDeleteAll={deleteAllArticles}
        currentUser={currentUser}
        language={language}
        setConfirmConfig={setConfirmConfig}
        setAlertConfig={setAlertConfig}
      />;
      case 'settings': return <Settings 
        settings={settings} 
        companies={companies}
        onNewCompany={() => { setEditingCompany(null); setView('company-form'); }}
        onEditCompany={(c) => { setEditingCompany(c); setView('company-form'); }}
        onDeleteCompany={deleteCompany}
        isDark={isDark} 
        onToggleTheme={() => setIsDark(!isDark)} 
        onUpdateSetting={updateSetting} 
        onReset={resetData}
        onBackup={handleBackup}
        onRestore={handleRestore}
        onLogout={handleLogout}
        language={language}
        onSetLanguage={setLanguage}
        onSync={fetchData}
        setConfirmConfig={setConfirmConfig}
        setAlertConfig={setAlertConfig}
      />;
      default: return <Dashboard 
        data={data} 
        reports={reports}
        clients={clients}
        articles={articles}
        currentUser={currentUser} 
        technicians={technicians} 
        onNavigate={setActiveTab} 
        language={language} 
        setLanguage={setLanguage}
        setConfirmConfig={setConfirmConfig}
        setAlertConfig={setAlertConfig}
      />;
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-50 dark:bg-slate-950 overflow-hidden relative shadow-2xl">
      {currentUser && view === 'main' && (
        <header className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 z-20">
          <div className="flex items-center gap-2">
            {settings.logo ? (
              <img src={settings.logo} alt="Logo" className="h-8 w-auto object-contain" />
            ) : (
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                R
              </div>
            )}
            <span className="font-bold text-lg tracking-tight">RAPPORTINI<span className="text-slate-400 font-light">PRO</span></span>
            {isSyncing && (
              <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Sync</span>
              </div>
            )}
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors"
            title={translations[language]['logout']}
          >
            <LogOut size={20} />
          </button>
        </header>
      )}

      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={view === 'main' ? activeTab : view}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>

        <ConfirmModal 
          isOpen={confirmConfig?.isOpen || false}
          title={confirmConfig?.title || ''}
          message={confirmConfig?.message || ''}
          onConfirm={confirmConfig?.onConfirm || (() => {})}
          onCancel={() => setConfirmConfig(null)}
          language={language}
        />

        <AlertModal 
          isOpen={alertConfig?.isOpen || false}
          title={alertConfig?.title || ''}
          message={alertConfig?.message || ''}
          onClose={() => setAlertConfig(null)}
          language={language}
        />

        {isSaving && (
          <div className="fixed inset-0 z-[100] bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-bold text-slate-600 dark:text-slate-300">{translations[language]['saving']}...</p>
          </div>
        )}
      </main>

      {view === 'main' && (
        <nav className="flex items-center justify-between bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-1 py-2 safe-area-bottom overflow-x-auto no-scrollbar">
          <div className="flex items-center justify-around w-full min-w-max gap-1">
            <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={LayoutDashboard} label={translations[language]['dashboard']} />
            <TabButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={FileText} label={translations[language]['reports']} />
            <TabButton active={activeTab === 'clients'} onClick={() => setActiveTab('clients')} icon={Users} label={translations[language]['clients']} />
            <TabButton active={activeTab === 'technicians'} onClick={() => setActiveTab('technicians')} icon={User} label={translations[language]['technicians']} />
            <TabButton active={activeTab === 'articles'} onClick={() => setActiveTab('articles')} icon={Package} label={translations[language]['articles']} />
            <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={SettingsIcon} label={translations[language]['settings']} />
          </div>
        </nav>
      )}
    </div>
  );
}
