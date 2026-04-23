import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronLeft, 
  Pencil, 
  Trash2, 
  Download, 
  Share2, 
  Mail, 
  Archive,
  Clock,
  User,
  Package,
  MapPin,
  Calendar
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it, enUS, es as esLocale } from 'date-fns/locale';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { Report } from '../types';
import { translations, Language } from '../translations';
import { Button, Card, LoadingIndicator } from './UI';

export const ReportDetail = ({ 
  report, 
  settings, 
  onBack, 
  onEdit, 
  onDelete, 
  language,
  setAlertConfig
}: { 
  report: Report, 
  settings: Record<string, string>, 
  onBack: () => void, 
  onEdit: (r: Report) => void, 
  onDelete: (id: number) => void, 
  language: Language,
  setAlertConfig: (config: any) => void
}) => {
  const t = (key: keyof typeof translations['it']) => translations[language][key];
  const reportRef = useRef<HTMLDivElement>(null);

  const [shareStatus, setShareStatus] = useState<'idle' | 'generating' | 'sharing'>('idle');
  const [translatedDescription, setTranslatedDescription] = useState<string>(report.description || '');
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (!report.description) {
      setTranslatedDescription('');
      return;
    }

    if (language === 'it') {
      setTranslatedDescription(report.description);
      return;
    }

    let isMounted = true;
    const translateDesc = async () => {
      setIsTranslating(true);
      try {
        const langName = language === 'en' ? 'English' : language === 'es' ? 'Spanish' : 'Italian';
        
        const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                text: report.description, 
                targetLanguage: langName 
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();

        if (isMounted && data.translation) {
          setTranslatedDescription(data.translation);
        }
      } catch (error: any) {
        console.error("Translation error:", error);
        if (isMounted) {
            setTranslatedDescription(`[Translation failed: ${error.message}] \n\n ${report.description}`);
        }
      } finally {
        if (isMounted) {
            setIsTranslating(false);
        }
      }
    };
    
    translateDesc();
    
    return () => { isMounted = false; };
  }, [language, report.description]);

  const generatePDF = async () => {
    if (!reportRef.current) return null;
    try {
      setShareStatus('generating');
      const element = reportRef.current;
      
      const dataUrl = await toPng(element, { 
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        width: 950,
        skipFonts: true,
        imagePlaceholder: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        style: {
          width: '950px',
          minHeight: '1343px',
          maxWidth: 'none',
          transform: 'none'
        }
      });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(dataUrl);
      const ratio = imgProps.width / imgProps.height;
      
      const imgWidth = pdfWidth;
      const imgHeight = pdfWidth / ratio;
      
      let heightLeft = imgHeight;
      let position = 0;
      let currentPage = 1;
      const totalPages = Math.ceil(imgHeight / pageHeight);

      pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
      
      // Aggiungi numero di pagina
      pdf.setFillColor(255, 255, 255);
      pdf.rect(pdfWidth / 2 - 20, pageHeight - 12, 40, 8, 'F');
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text(`${t('page')} ${currentPage} ${t('of')} ${totalPages}`, pdfWidth / 2, pageHeight - 6, { align: 'center' });
      
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        currentPage++;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
        
        // Aggiungi numero di pagina
        pdf.setFillColor(255, 255, 255);
        pdf.rect(pdfWidth / 2 - 20, pageHeight - 12, 40, 8, 'F');
        pdf.setFontSize(10);
        pdf.setTextColor(100);
        pdf.text(`${t('page')} ${currentPage} ${t('of')} ${totalPages}`, pdfWidth / 2, pageHeight - 6, { align: 'center' });
        
        heightLeft -= pageHeight;
      }
      
      return pdf;
    } catch (error) {
      console.error('PDF Generation error:', error);
      setAlertConfig({
        isOpen: true,
        title: translations[language]['error'],
        message: t('pdf_generation_error')
      });
      return null;
    }
  };

  const savePDF = (pdf: any, fileName: string) => {
    try {
      pdf.save(fileName);
    } catch (e) {
      console.warn("pdf.save failed, trying fallback", e);
      setTimeout(() => {
        try {
          const blobUrl = pdf.output('bloburl');
          window.location.href = blobUrl;
        } catch (fallbackError) {
          console.error("PDF fallback download failed", fallbackError);
        }
      }, 100);
    }
  };

  const getReportFileName = () => {
    const safeClientName = (report.client_name || t('client')).replace(/[^a-zA-Z0-9]/g, '_');
    const dateStr = report.days && report.days.length > 0 && report.days[0].date 
      ? format(parseISO(report.days[0].date), 'dd-MM-yyyy') 
      : report.date ? format(parseISO(report.date), 'dd-MM-yyyy') : t('unknown_date');
    return `Rapportino_${safeClientName}_${dateStr}.pdf`;
  };

  const downloadPDF = async () => {
    try {
      setShareStatus('generating');
      const pdf = await generatePDF();
      if (pdf) {
        savePDF(pdf, getReportFileName());
      }
    } catch (error) {
      console.error('Download PDF error:', error);
      setAlertConfig({
        isOpen: true,
        title: translations[language]['error'],
        message: translations[language]['error_saving_report']
      });
    } finally {
      setShareStatus('idle');
    }
  };

  const sendEmail = async () => {
    const subject = `${t('report_intervention')} - ${report.client_name}`;
    const dateStr = report.days && report.days.length > 0 && report.days[0].date ? format(parseISO(report.days[0].date), 'dd/MM/yyyy') : '';
    const body = `${t('email_body_prefix')} ${dateStr}.\n\n${t('description')}:\n${translatedDescription}`;
    const clientEmail = report.client_email || '';

    try {
      setShareStatus('generating');
      const pdf = await generatePDF();
      if (!pdf) return;

      const fileName = getReportFileName();
      const pdfBlob = pdf.output('blob');
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: subject,
            text: body,
          });
          return;
        } catch (shareError: any) {
          if (shareError && shareError.name !== 'AbortError') {
            console.error('Share API error:', shareError);
          } else {
            return;
          }
        }
      }

      savePDF(pdf, fileName);
      
      const mailtoLink = `mailto:${clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body + '\n\n' + t('pdf_email_attachment_note'))}`;
      setTimeout(() => {
        window.location.href = mailtoLink;
      }, 500);
      
    } catch (error) {
      console.error('Error in sendEmail:', error);
      setAlertConfig({
        isOpen: true,
        title: translations[language]['error'],
        message: t('error_preparing_email')
      });
    } finally {
      setShareStatus('idle');
    }
  };

  const archiveReport = async () => {
    try {
      setShareStatus('generating');
      const pdf = await generatePDF();
      if (!pdf) return;

      const fileName = getReportFileName();
      savePDF(pdf, fileName);

      const pdfBase64 = pdf.output('datauristring');
      await fetch(`/api/reports/${report.id}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64 })
      });

      setAlertConfig({
        isOpen: true,
        title: translations[language]['success'],
        message: t('archive_success')
      });
    } catch (error) {
      console.error('Archive error:', error);
      setAlertConfig({
        isOpen: true,
        title: translations[language]['error'],
        message: t('archive_error')
      });
    } finally {
      setShareStatus('idle');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      {shareStatus !== 'idle' && <LoadingIndicator message={t('generating_pdf')} />}
      <header className="p-4 flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">{t('report_detail')}</h1>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(report)} className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors">
            <Pencil size={20} />
          </button>
          <button onClick={() => onDelete(report.id)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors">
            <Trash2 size={20} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Button onClick={downloadPDF} variant="secondary" className="w-full justify-start gap-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <Download size={20} className="text-indigo-500" /> {t('download_pdf')}
          </Button>
          <Button onClick={sendEmail} variant="secondary" className="w-full justify-start gap-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <Share2 size={20} className="text-emerald-500" /> {t('share_report')}
          </Button>
          <Button onClick={archiveReport} variant="secondary" className="w-full justify-start gap-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <Archive size={20} className="text-amber-500" /> {t('archive_report')}
          </Button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 overflow-hidden overflow-x-auto">
          <div ref={reportRef} className="p-8 flex flex-col gap-8 bg-white text-slate-900 min-h-[1343px] w-[950px] min-w-[950px] mx-auto origin-top sm:scale-100">
            <header className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
              <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">{report.company_name || t('report_intervention')}</h1>
                {report.company_name && (
                  <div className="text-xs font-medium text-slate-500 flex flex-col">
                    {report.company_address && <span>{report.company_address}</span>}
                    {report.company_vat && <span>{t('vat')}: {report.company_vat}</span>}
                    {(report.company_phone || report.company_email) && (
                      <span>Tel: {report.company_phone} {report.company_email ? `- ${report.company_email}` : ''}</span>
                    )}
                  </div>
                )}
              </div>
              {report.company_logo && (
                <img src={report.company_logo} alt="Logo" className="h-16 w-auto object-contain" />
              )}
            </header>

            <div className="grid grid-cols-2 gap-8">
              <div className="flex flex-col gap-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-1">{t('client')}</h3>
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-slate-900">{report.client_name}</span>
                  <span className="text-sm text-slate-600 flex items-center gap-1.5 mt-1">
                    <MapPin size={12} /> {report.client_address}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-1">{t('intervention_details')}</h3>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar size={14} className="text-slate-400" />
                    <span className="font-bold">{report.date ? format(parseISO(report.date), 'dd MMMM yyyy', { locale: language === 'it' ? it : language === 'es' ? esLocale : enUS }) : '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User size={14} className="text-slate-400" />
                    <span>{t('technician_label')} <span className="font-bold">{report.technician_name}</span></span>
                  </div>
                </div>
              </div>
            </div>

            {report.machine_brand && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('machine_system')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400">{t('model')}</span>
                    <span className="text-sm font-bold">{report.machine_brand} {report.machine_type}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400">{t('serial_year')}</span>
                    <span className="text-sm font-bold">{report.machine_serial} {report.machine_year ? `(${report.machine_year})` : ''}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('description')}</h3>
                {isTranslating && (
                  <div className="flex items-center gap-1 text-[10px] text-indigo-500 font-bold uppercase tracking-widest animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    {t('translating')}
                  </div>
                )}
              </div>
              <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap min-h-[100px]">
                {translatedDescription || report.description}
              </p>
            </div>

            {report.items && report.items.length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-1">{t('items')}</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-slate-100">
                      <th className="py-2 font-black uppercase text-[10px] text-slate-400">{t('code')}</th>
                      <th className="py-2 font-black uppercase text-[10px] text-slate-400">{t('description')}</th>
                      <th className="py-2 font-black uppercase text-[10px] text-slate-400 text-center">{t('quantity')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-50">
                        <td className="py-2 font-bold">{item.code}</td>
                        <td className="py-2">{item.description}</td>
                        <td className="py-2 text-center font-bold">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="grid grid-cols-2 gap-8">
              <div className="flex flex-col gap-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-1">{t('hours_expenses_summary')}</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-slate-100">
                      <th className="py-2 font-black uppercase text-[10px] text-slate-400">{t('date')}</th>
                      <th className="py-2 font-black uppercase text-[10px] text-slate-400 text-center">{t('work_hours')}</th>
                      <th className="py-2 font-black uppercase text-[10px] text-slate-400 text-center">{t('travel_hours')}</th>
                      <th className="py-2 font-black uppercase text-[10px] text-slate-400 text-center">{t('meals')}</th>
                      <th className="py-2 font-black uppercase text-[10px] text-slate-400 text-center">{t('overnight')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.days?.map((day, idx) => (
                      <tr key={idx} className="border-b border-slate-50">
                        <td className="py-2 font-bold">{format(parseISO(day.date), 'dd/MM/yy')}</td>
                        <td className="py-2 text-center">{day.work_hours}h</td>
                        <td className="py-2 text-center">{day.travel_hours}h</td>
                        <td className="py-2 text-center">{day.meals}</td>
                        <td className="py-2 text-center">{day.overnight ? t('yes') : t('no')}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white">
                      <td className="py-2 px-3 font-black uppercase text-[10px]">{t('total')}</td>
                      <td className="py-2 text-center font-bold">{report.days?.reduce((acc, d) => acc + d.work_hours, 0)}h</td>
                      <td className="py-2 text-center font-bold">{report.days?.reduce((acc, d) => acc + d.travel_hours, 0)}h</td>
                      <td className="py-2 text-center font-bold">{report.days?.reduce((acc, d) => acc + d.meals, 0)}</td>
                      <td className="py-2 text-center font-bold">{report.days?.filter(d => d.overnight).length}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-1">{t('kilometers')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{t('km_client')}</span>
                    <span className="text-lg font-bold">{report.client_km || 0}</span>
                  </div>
                  <div className="flex flex-col bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{t('km_extra')}</span>
                    <span className="text-lg font-bold">{report.extra_km || 0}</span>
                  </div>
                  <div className="flex flex-col bg-indigo-50 p-3 rounded-lg border border-indigo-100 col-span-2">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase">{t('total_km')}</span>
                    <span className="text-xl font-bold text-indigo-600">{(report.client_km || 0) + (report.extra_km || 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mt-auto pt-8 border-t-2 border-slate-900">
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('signature_tech')}</span>
                <div className="h-24 border border-slate-100 rounded-xl flex items-center justify-center bg-slate-50/50">
                  {report.signature_tech ? (
                    <img src={report.signature_tech} alt={t('signature_tech')} className="max-h-full max-w-full object-contain mix-blend-multiply" />
                  ) : (
                    <span className="text-[10px] text-slate-300 italic">{t('no_signature')}</span>
                  )}
                </div>
                <span className="text-[10px] text-center font-bold text-slate-400">{report.technician_name}</span>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('signature_client')}</span>
                <div className="h-24 border border-slate-100 rounded-xl flex items-center justify-center bg-slate-50/50">
                  {report.signature_client ? (
                    <img src={report.signature_client} alt={t('signature_client')} className="max-h-full max-w-full object-contain mix-blend-multiply" />
                  ) : (
                    <span className="text-[10px] text-slate-300 italic">{t('no_signature')}</span>
                  )}
                </div>
                <span className="text-[10px] text-center font-bold text-slate-400">{report.client_name}</span>
              </div>
            </div>

            <footer className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Documento generato da</span>
                <span className="text-xs font-black text-indigo-600">Rapportini Pro</span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                ID: {report.id} - Ref: {format(new Date(), 'yyyyMMddHHmm')}
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};
