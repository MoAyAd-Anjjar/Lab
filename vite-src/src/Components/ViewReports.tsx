import React, { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import * as Neutralino from '@neutralinojs/lib';
import './Repot.css';
declare const NL_PATH: string;

type Props = { onBack: () => void };

type Patient = {
  idintity?: string;
  name?: string;
  age?: string;
  address?: string;
  phone?: string | number;
  notes?: string;
  image_path?: string;
  insert_date?: string;
  update_date?: string;
  view_at?: string;
  gender?: string;
  bloodType?: string;
};

type DiagnosisTemplate = {
  id: number;
  name: string;
  category: string;
  content: string;
};

const reportsDir = (base: string) => base + '/reports';
const dataDir = (base: string) => base + '/data';
const patientsFile = (base: string) => dataDir(base) + '/patients.xlsx';
const templatesFile = (base: string) => dataDir(base) + '/diagnosis_templates.json';

const ViewReports: React.FC<Props> = ({ onBack }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [reports, setReports] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);

  // Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [searchCategory, setSearchCategory] = useState<'all' | 'name' | 'id' | 'phone'>('all');

  // Modal states
  const [viewModalTitle, setViewModalTitle] = useState<string | null>(null);
  const [viewHtmlContent, setViewHtmlContent] = useState<string | null>(null);
  const [viewPdfPath, setViewPdfPath] = useState<string | null>(null);

  // Create report modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createPatient, setCreatePatient] = useState<Patient | null>(null);
  const [diagnosis, setDiagnosis] = useState<string>('');
  const [createImageDataUrl, setCreateImageDataUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Diagnosis templates
  const [diagnosisTemplates, setDiagnosisTemplates] = useState<DiagnosisTemplate[]>([
    { id: 1, name: 'التهاب رئوي', category: 'جهاز تنفسي', content: 'التهاب رئوي في الرئة اليمنى مع ارتفاع في درجة الحرارة وسعال جاف.' },
    { id: 2, name: 'ارتفاع ضغط الدم', category: 'قلب وأوعية', content: 'ارتفاع ضغط الدم من الدرجة الثانية، يحتاج إلى متابعة منتظمة.' },
    { id: 3, name: 'سكري النوع الثاني', category: 'غدد صماء', content: 'سكري النوع الثاني، مستوى السكر التراكمي مرتفع، يحتاج إلى تعديل جرعات الأدوية.' },
    { id: 4, name: 'التهاب مفاصل', category: 'عظام', content: 'التهاب مفاصل في الركبتين مع صعوبة في الحركة.' },
    { id: 5, name: 'صداع نصفي', category: 'أعصاب', content: 'صداع نصفي مزمن مع حساسية للضوء والضوضاء.' },
    { id: 6, name: 'حساسية جلدية', category: 'جلدية', content: 'حساسية جلدية مع حكة وطفح جلدي، يحتاج إلى كريمات مرطبة.' },
  ]);
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [editingTemplate, setEditingTemplate] = useState<DiagnosisTemplate | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const diagnosisRef = useRef<HTMLTextAreaElement>(null);

  // Load diagnosis templates
  const loadTemplates = async () => {
    try {
      const raw = await Neutralino.filesystem.readFile(templatesFile(NL_PATH));
      const templates = JSON.parse(raw as string);
      setDiagnosisTemplates(templates);
    } catch {
      // Use default templates
      try {
        await Neutralino.filesystem.createDirectory(dataDir(NL_PATH));
        await Neutralino.filesystem.writeFile(
          templatesFile(NL_PATH),
          JSON.stringify(diagnosisTemplates, null, 2)
        );
      } catch (err) {
        console.warn('Could not save templates file', err);
      }
    }
  };

  // Save templates
  const saveTemplates = async () => {
    try {
      await Neutralino.filesystem.writeFile(
        templatesFile(NL_PATH),
        JSON.stringify(diagnosisTemplates, null, 2)
      );
    } catch (err) {
      console.error('Failed to save templates', err);
    }
  };

  // Filter templates
  const filteredTemplates = diagnosisTemplates.filter(template => {
    const matchesSearch = template.name.includes(templateSearch) || 
                         template.content.includes(templateSearch) ||
                         template.category.includes(templateSearch);
    const matchesCategory = selectedCategory === 'الكل' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Insert template into diagnosis
  const insertTemplate = (content: string) => {
    const textarea = diagnosisRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = diagnosis.substring(0, start) + content + diagnosis.substring(end);
      setDiagnosis(newText);
      
      // Focus back and set cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + content.length, start + content.length);
      }, 0);
    }
  };

  const loadPatients = async () => {
    setLoading(true);
    try {
      let workbook: XLSX.WorkBook;
      try {
        const raw = await Neutralino.filesystem.readBinaryFile(patientsFile(NL_PATH));
        const bytes = new Uint8Array(raw as ArrayBuffer);
        workbook = XLSX.read(bytes, { type: 'array' });
      } catch {
        await Neutralino.filesystem.createDirectory(dataDir(NL_PATH));
        workbook = XLSX.utils.book_new();
        const header = [['idintity','name','age','gender','bloodType','address','phone','notes','image_path','insert_date','update_date','view_at']];
        const sheet = XLSX.utils.aoa_to_sheet(header);
        XLSX.utils.book_append_sheet(workbook, sheet, 'Patients');
        const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        await Neutralino.filesystem.writeBinaryFile(patientsFile(NL_PATH), bytes);
      }

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as any[];
      const list = json.map(r => ({
        idintity: r.idintity ?? r.ID ?? r.Id ?? '',
        name: r.name ?? r.Name ?? '',
        age: r.age ?? '',
        gender: r.gender ?? '',
        bloodType: r.bloodType ?? '',
        address: r.address ?? '',
        phone: r.phone ?? '',
        notes: r.notes ?? '',
        image_path: r.image_path ?? '',
        insert_date: r.insert_date ?? '',
      })) as Patient[];
      
      setPatients(list);
      setFilteredPatients(list);
    } catch (err) {
      console.error('Failed to load patients', err);
      setPatients([]);
      setFilteredPatients([]);
    } finally {
      setLoading(false);
    }
  };

  // Search patients
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPatients(patients);
      return;
    }

    const filtered = patients.filter(patient => {
      const search = searchTerm.toLowerCase();
      
      switch (searchCategory) {
        case 'name':
          return patient.name?.toLowerCase().includes(search) ?? false;
        case 'id':
          return patient.idintity?.toLowerCase().includes(search) ?? false;
        case 'phone':
          return patient.phone?.toString().toLowerCase().includes(search) ?? false;
        default:
          return (
            patient.name?.toLowerCase().includes(search) ||
            patient.idintity?.toLowerCase().includes(search) ||
            patient.phone?.toString().toLowerCase().includes(search) ||
            patient.address?.toLowerCase().includes(search) ||
            false
          );
      }
    });

    setFilteredPatients(filtered);
  }, [searchTerm, searchCategory, patients]);

  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const dir = reportsDir(NL_PATH);
      try { await Neutralino.filesystem.createDirectory(dir); } catch {}
      const entries: any = await Neutralino.filesystem.readDirectory(dir);
      let files: string[] = [];
      if (Array.isArray(entries)) {
        files = entries.map((e: any) => typeof e === 'string' ? e : e.entry ?? e.name ?? '');
      } else if (entries && entries.files) {
        files = entries.files.map((f: any) => f.name ?? f);
      }
      files = files.filter(f => f && (f.endsWith('.html') || f.endsWith('.pdf')));
      files.sort((a,b) => b.localeCompare(a));
      setReports(files);
    } catch (err) {
      console.error('Failed to read reports folder', err);
      setReports([]);
    } finally {
      setLoadingReports(false);
    }
  };

  const openCreateModal = async (p: Patient) => {
    setCreatePatient(p);
    setDiagnosis(p.notes || '');
    setCreateImageDataUrl(null);
    if (p?.image_path) {
      try {
        const raw = await Neutralino.filesystem.readBinaryFile(p.image_path);
        const bytes = new Uint8Array(raw as ArrayBuffer);
        const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
        const base64 = btoa(binary);
        const ext = p.image_path.split('.').pop()?.toLowerCase();
        const mime = ext === 'png' ? 'image/png' : (ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/*');
        setCreateImageDataUrl(`data:${mime};base64,${base64}`);
      } catch (e) {
        console.warn('Could not load patient image', e);
      }
    }
    setCreateModalOpen(true);
  };

  const saveReport = async () => {
    if (!createPatient) return;
    setGenerating(true);
    try {
      const dir = reportsDir(NL_PATH);
      try { await Neutralino.filesystem.createDirectory(dir); } catch {}
      
      const id = createPatient.idintity || 'unknown';
      const fileBase = `report_${id}_${Date.now()}`;
      const htmlPath = `${dir}/${fileBase}.html`;

      const patientInfoHtml = `
        <div class="report-container">
          <div class="report-header">
            <div class="clinic-info">
              <h1>العيادة الطبية المتخصصة</h1>
              <p>تقرير طبي - Medical Report</p>
            </div>
            <div class="report-meta">
              <p><strong>رقم التقرير:</strong> ${fileBase}</p>
              <p><strong>التاريخ:</strong> ${new Date().toLocaleDateString('ar-EG')}</p>
            </div>
          </div>
          
          <div class="patient-section">
            <div class="patient-photo">
              ${createImageDataUrl ? `<img src="${createImageDataUrl}" alt="صورة المريض" />` : '<div class="no-photo">لا توجد صورة</div>'}
            </div>
            <div class="patient-details">
              <h2>معلومات المريض</h2>
              <div class="details-grid">
                <div><strong>الاسم:</strong> ${createPatient.name || ''}</div>
                <div><strong>رقم الهوية:</strong> ${createPatient.idintity || ''}</div>
                <div><strong>العمر:</strong> ${createPatient.age || ''}</div>
                <div><strong>الجنس:</strong> ${createPatient.gender || ''}</div>
                <div><strong>فصيلة الدم:</strong> ${createPatient.bloodType || ''}</div>
                <div><strong>الهاتف:</strong> ${createPatient.phone || ''}</div>
                <div><strong>العنوان:</strong> ${createPatient.address || ''}</div>
                <div><strong>تاريخ الإضافة:</strong> ${createPatient.insert_date || ''}</div>
              </div>
            </div>
          </div>
          
          <div class="diagnosis-section">
            <h2><span>📋</span> التشخيص والعلاج</h2>
            <div class="diagnosis-content">
              ${diagnosis.split('\n').map(line => `<p>${line}</p>`).join('')}
            </div>
          </div>
          
          <div class="footer-section">
            <div class="doctor-signature">
              <p>________________________________</p>
              <p><strong>اسم الطبيب:</strong> د. أحمد محمد</p>
              <p><strong>التخصص:</strong> طب عام</p>
              <p><strong>رقم الترخيص:</strong> MED-2023-4567</p>
            </div>
            <div class="stamp-placeholder">
              <div class="stamp">
                <span>ختم العيادة</span>
              </div>
            </div>
          </div>
        </div>
      `;

      const fullHtml = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>تقرير طبي - ${createPatient.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Tajawal', sans-serif; background: #fff; color: #333; padding: 20px; }
            
            .report-container {
              max-width: 1000px;
              margin: 0 auto;
              padding: 30px;
              background: #fff;
              box-shadow: 0 0 30px rgba(0,0,0,0.1);
              border-radius: 15px;
            }
            
            .report-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding-bottom: 20px;
              border-bottom: 3px solid #4f46e5;
              margin-bottom: 30px;
            }
            
            .clinic-info h1 {
              color: #4f46e5;
              font-size: 28px;
              margin-bottom: 5px;
            }
            
            .clinic-info p {
              color: #666;
              font-size: 16px;
            }
            
            .report-meta {
              text-align: left;
              background: #f8fafc;
              padding: 15px;
              border-radius: 10px;
              border: 1px solid #e2e8f0;
            }
            
            .patient-section {
              display: flex;
              gap: 30px;
              margin-bottom: 30px;
              padding: 20px;
              background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
              border-radius: 12px;
            }
            
            .patient-photo {
              flex: 0 0 180px;
            }
            
            .patient-photo img {
              width: 100%;
              height: 200px;
              object-fit: cover;
              border-radius: 10px;
              border: 3px solid #fff;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            
            .no-photo {
              width: 100%;
              height: 200px;
              background: linear-gradient(135deg, #4f46e5, #7c3aed);
              border-radius: 10px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 18px;
            }
            
            .patient-details {
              flex: 1;
            }
            
            .patient-details h2 {
              color: #4f46e5;
              margin-bottom: 20px;
              font-size: 24px;
              border-right: 4px solid #4f46e5;
              padding-right: 15px;
            }
            
            .details-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
            }
            
            .details-grid div {
              padding: 12px 15px;
              background: white;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
            }
            
            .diagnosis-section {
              margin-bottom: 40px;
            }
            
            .diagnosis-section h2 {
              color: #dc2626;
              font-size: 24px;
              margin-bottom: 20px;
              display: flex;
              align-items: center;
              gap: 10px;
              border-right: 4px solid #dc2626;
              padding-right: 15px;
            }
            
            .diagnosis-content {
              background: #fef2f2;
              padding: 25px;
              border-radius: 12px;
              border: 1px solid #fecaca;
              line-height: 1.8;
              font-size: 18px;
              min-height: 200px;
            }
            
            .diagnosis-content p {
              margin-bottom: 10px;
            }
            
            .footer-section {
              display: flex;
              justify-content: space-between;
              margin-top: 50px;
              padding-top: 30px;
              border-top: 2px dashed #cbd5e1;
            }
            
            .doctor-signature {
              flex: 1;
            }
            
            .doctor-signature p {
              margin-bottom: 10px;
              color: #555;
            }
            
            .stamp-placeholder {
              text-align: center;
            }
            
            .stamp {
              width: 150px;
              height: 150px;
              border: 3px solid #dc2626;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              transform: rotate(15deg);
            }
            
            .stamp span {
              color: #dc2626;
              font-weight: bold;
              font-size: 18px;
            }
            
            @media print {
              body { padding: 0; }
              .report-container { box-shadow: none; border: 2px solid #000; }
              .no-print { display: none !important; }
              .patient-section { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          ${patientInfoHtml}
          <div class="no-print" style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 14px;">هذا التقرير تم إنشاؤه آلياً من قبل النظام الطبي</p>
          </div>
        </body>
        </html>
      `;

      await Neutralino.filesystem.writeFile(htmlPath, fullHtml);
      
      // Try to generate PDF using jsPDF if available
      let pdfCreated = false;
      const pdfPath = `${dir}/${fileBase}.pdf`;
      
      try {
        if ((window as any).jspdf) {
          const { jsPDF } = (window as any).jspdf;
          const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
          });

          // Simple PDF generation as HTML to PDF conversion is complex
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(20);
          doc.text('Medical Report', 105, 20, { align: 'center' });
          
          doc.setFontSize(12);
          doc.text(`Patient: ${createPatient.name || ''}`, 20, 40);
          doc.text(`ID: ${createPatient.idintity || ''}`, 20, 50);
          doc.text(`Age: ${createPatient.age || ''}`, 20, 60);
          
          // Add diagnosis
          const splitText = doc.splitTextToSize(diagnosis, 170);
          doc.text('Diagnosis:', 20, 80);
          doc.text(splitText, 20, 90);
          
          doc.save(pdfPath);
          pdfCreated = true;
        }
      } catch (pdfErr) {
        console.warn('PDF generation failed:', pdfErr);
      }

      await loadReports();
      setCreateModalOpen(false);
      setCreatePatient(null);
      setDiagnosis('');
      setCreateImageDataUrl(null);
      
      alert(`✅ تم إنشاء التقرير بنجاح!${pdfCreated ? ' (HTML + PDF)' : ' (HTML فقط)'}`);
      
      // Open the report in new tab for printing
      const fileUrl = `file://${htmlPath.replace(/\\/g, '/')}`;
      window.open(fileUrl, '_blank');
      
    } catch (err) {
      console.error('Error saving report:', err);
      alert('❌ حدث خطأ أثناء إنشاء التقرير');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html dir="rtl" lang="ar">
          <head>
            <title>طباعة التقرير</title>
            <style>
              body { font-family: 'Tajawal', sans-serif; padding: 20px; }
              .print-content { max-width: 800px; margin: 0 auto; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>
            <div class="print-content">
              ${printRef.current?.innerHTML || ''}
            </div>
            <script>
              window.onload = () => window.print();
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const viewReport = async (fileName: string) => {
    try {
      const path = reportsDir(NL_PATH) + '/' + fileName;
      if (fileName.endsWith('.html')) {
        const content: any = await Neutralino.filesystem.readFile(path);
        setViewModalTitle(fileName);
        setViewHtmlContent(typeof content === 'string' ? content : String(content));
        setViewPdfPath(null);
      } else if (fileName.endsWith('.pdf')) {
        setViewModalTitle(fileName);
        setViewPdfPath('file://' + path.replace(/\\/g, '/'));
        setViewHtmlContent(null);
      }
    } catch (err) {
      console.error('Failed to read report', err);
      alert('❌ فشل في فتح التقرير');
    }
  };

  const deleteReport = async (fileName: string) => {
    if (!confirm(`⚠️ هل أنت متأكد من حذف التقرير "${fileName}"؟`)) return;
    try {
      const path = reportsDir(NL_PATH) + '/' + fileName;
      await Neutralino.filesystem.removeFile(path);
      await loadReports();
      alert('✅ تم حذف التقرير بنجاح');
    } catch (err) {
      console.error('Failed to delete report', err);
      alert('❌ فشل في حذف التقرير');
    }
  };

  const addTemplate = () => {
    const newTemplate: DiagnosisTemplate = {
      id: Date.now(),
      name: 'قالب جديد',
      category: 'عام',
      content: 'محتوى القالب...'
    };
    setDiagnosisTemplates([...diagnosisTemplates, newTemplate]);
    setEditingTemplate(newTemplate);
  };

  const updateTemplate = () => {
    if (!editingTemplate) return;
    const updated = diagnosisTemplates.map(t => 
      t.id === editingTemplate.id ? editingTemplate : t
    );
    setDiagnosisTemplates(updated);
    saveTemplates();
    setEditingTemplate(null);
  };

  const deleteTemplate = (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا القالب؟')) return;
    const updated = diagnosisTemplates.filter(t => t.id !== id);
    setDiagnosisTemplates(updated);
    saveTemplates();
  };

  useEffect(() => {
    loadPatients();
    loadReports();
    loadTemplates();
  }, []);

  const categories = ['الكل', ...Array.from(new Set(diagnosisTemplates.map(t => t.category)))];

  return (
    <div className="reports-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <h1>📋 نظام التقارير الطبية</h1>
          <p className="subtitle">إدارة تقارير المرضى والتشخيصات الطبية</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={onBack}>
            ↩️ العودة
          </button>
          <button className="btn btn-primary" onClick={() => { loadPatients(); loadReports(); }}>
            🔄 تحديث
          </button>
        </div>
      </header>

      {/* Search Section */}
      <div className="search-section glass-card">
        <div className="search-header">
          <h3>🔍 بحث المرضى</h3>
        </div>
        <div className="search-controls">
          <div className="search-input-group">
            <input
              type="text"
              placeholder="ابحث عن مريض بالاسم، الرقم، الهاتف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
          
          <div className="search-filters">
            <div className="filter-group">
              <label>نوع البحث:</label>
              <select 
                value={searchCategory} 
                onChange={(e) => setSearchCategory(e.target.value as any)}
                className="filter-select"
              >
                <option value="all">الكل</option>
                <option value="name">الاسم</option>
                <option value="id">رقم الهوية</option>
                <option value="phone">الهاتف</option>
              </select>
            </div>
            
            <div className="stats">
              <span className="stat-badge">
                👥 {filteredPatients.length} مريض
              </span>
              <span className="stat-badge">
                📁 {reports.length} تقرير
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Patients Panel */}
        <div className="panel glass-card">
          <div className="panel-header">
            <h3>👥 قائمة المرضى</h3>
            <div className="panel-badge">{filteredPatients.length}</div>
          </div>
          
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>جاري تحميل بيانات المرضى...</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👤</div>
              <p>لا توجد نتائج</p>
              {searchTerm && <p>جرب بحثاً مختلفاً</p>}
            </div>
          ) : (
            <div className="patients-grid">
              {filteredPatients.map((patient, idx) => (
                <div key={`${patient.idintity}_${idx}`} className="patient-card">
                  <div className="patient-card-header">
                    <div className="patient-avatar">
                      {patient.name?.charAt(0) || '?'}
                    </div>
                    <div className="patient-info">
                      <h4>{patient.name || 'غير معروف'}</h4>
                      <p className="patient-id">{patient.idintity || 'بدون هوية'}</p>
                    </div>
                    {patient.gender && (
                      <span className={`gender-badge ${patient.gender === 'ذكر' ? 'male' : 'female'}`}>
                        {patient.gender === 'ذكر' ? '♂' : '♀'}
                      </span>
                    )}
                  </div>
                  
                  <div className="patient-details">
                    <div className="detail-item">
                      <span className="detail-label">العمر:</span>
                      <span className="detail-value">{patient.age || '--'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">الهاتف:</span>
                      <span className="detail-value">{patient.phone || '--'}</span>
                    </div>
                    {patient.bloodType && (
                      <div className="detail-item">
                        <span className="detail-label">فصيلة الدم:</span>
                        <span className="detail-value blood-type">{patient.bloodType}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="patient-actions">
                    <button 
                      className="btn-action primary"
                      onClick={() => openCreateModal(patient)}
                    >
                      📝 إنشاء تقرير
                    </button>
                    <button 
                      className="btn-action secondary"
                      onClick={() => {
                        setViewModalTitle(`معلومات المريض: ${patient.name}`);
                        setViewHtmlContent(`
                          <div style="padding: 20px; font-family: 'Tajawal'; direction: rtl">
                            <h2>معلومات المريض</h2>
                            <pre>${JSON.stringify(patient, null, 2)}</pre>
                          </div>
                        `);
                        setViewPdfPath(null);
                      }}
                    >
                      👁️ عرض التفاصيل
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reports Panel */}
        <div className="panel glass-card">
          <div className="panel-header">
            <h3>📁 التقارير السابقة</h3>
            <div className="panel-badge">{reports.length}</div>
          </div>
          
          {loadingReports ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>جاري تحميل التقارير...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📄</div>
              <p>لا توجد تقارير بعد</p>
              <p className="hint">قم بإنشاء تقرير جديد للمرضى</p>
            </div>
          ) : (
            <div className="reports-list">
              {reports.map((file, index) => (
                <div key={index} className="report-item">
                  <div className="report-icon">
                    {file.endsWith('.pdf') ? '📕' : '🌐'}
                  </div>
                  <div className="report-info">
                    <div className="report-name">{file}</div>
                    <div className="report-type">
                      {file.endsWith('.pdf') ? 'PDF ملف' : 'HTML صفحة ويب'}
                    </div>
                  </div>
                  <div className="report-actions">
                    <button 
                      className="btn-icon view"
                      onClick={() => viewReport(file)}
                      title="عرض التقرير"
                    >
                      👁️
                    </button>
                    <button 
                      className="btn-icon print"
                      onClick={() => {
                        const path = reportsDir(NL_PATH) + '/' + file;
                        const url = 'file://' + path.replace(/\\/g, '/');
                        window.open(url, '_blank');
                      }}
                      title="طباعة"
                    >
                      🖨️
                    </button>
                    <button 
                      className="btn-icon delete"
                      onClick={() => deleteReport(file)}
                      title="حذف التقرير"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Report Modal */}
      {createModalOpen && createPatient && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>📝 إنشاء تقرير جديد</h2>
              <button 
                className="modal-close"
                onClick={() => setCreateModalOpen(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              {/* Patient Info Section */}
              <div className="patient-preview glass-card">
                <div className="patient-preview-header">
                  <div className="patient-avatar-large">
                    {createImageDataUrl ? (
                      <img src={createImageDataUrl} alt="صورة المريض" />
                    ) : (
                      <span>{createPatient.name?.charAt(0) || '?'}</span>
                    )}
                  </div>
                  <div className="patient-preview-info">
                    <h3>{createPatient.name}</h3>
                    <div className="patient-tags">
                      <span className="tag">🆔 {createPatient.idintity}</span>
                      <span className="tag">🎂 {createPatient.age} سنة</span>
                      {createPatient.gender && <span className="tag">{createPatient.gender === 'ذكر' ? '♂' : '♀'} {createPatient.gender}</span>}
                      {createPatient.bloodType && <span className="tag blood">🩸 {createPatient.bloodType}</span>}
                    </div>
                  </div>
                </div>
                
                <div className="patient-preview-details">
                  <div className="detail-row">
                    <span className="label">📱 الهاتف:</span>
                    <span>{createPatient.phone || '--'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">🏠 العنوان:</span>
                    <span>{createPatient.address || '--'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">📅 تاريخ الإضافة:</span>
                    <span>{createPatient.insert_date || '--'}</span>
                  </div>
                </div>
              </div>

              {/* Diagnosis Templates Section */}
              <div className="templates-section">
                <div className="section-header">
                  <h3>📋 قوالب التشخيص</h3>
                  <div className="template-controls">
                    <div className="search-box">
                      <input
                        type="text"
                        placeholder="🔍 ابحث في القوالب..."
                        value={templateSearch}
                        onChange={(e) => setTemplateSearch(e.target.value)}
                        className="template-search"
                      />
                    </div>
                    <select 
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="category-select"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <button 
                      className="btn btn-small"
                      onClick={addTemplate}
                    >
                      ➕ إضافة قالب
                    </button>
                  </div>
                </div>

                <div className="templates-grid">
                  {filteredTemplates.map(template => (
                    <div key={template.id} className="template-card">
                      <div className="template-header">
                        <h4>{template.name}</h4>
                        <span className="template-category">{template.category}</span>
                      </div>
                      <p className="template-content">{template.content}</p>
                      <div className="template-actions">
                        <button 
                          className="btn-icon small"
                          onClick={() => insertTemplate(template.content)}
                          title="إدراج في التشخيص"
                        >
                          📥
                        </button>
                        <button 
                          className="btn-icon small"
                          onClick={() => setEditingTemplate(template)}
                          title="تعديل القالب"
                        >
                          ✏️
                        </button>
                        <button 
                          className="btn-icon small danger"
                          onClick={() => deleteTemplate(template.id)}
                          title="حذف القالب"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Diagnosis Editor */}
              <div className="diagnosis-editor">
                <div className="editor-header">
                  <h3>✍️ كتابة التشخيص</h3>
                  <div className="editor-stats">
                    <span className="stat">الحروف: {diagnosis.length}</span>
                    <span className="stat">الكلمات: {diagnosis.split(/\s+/).filter(w => w).length}</span>
                  </div>
                </div>
                
                <textarea
                  ref={diagnosisRef}
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="اكتب التشخيص الطبي هنا... يمكنك إدراج قوالب جاهزة من الأعلى"
                  className="diagnosis-textarea"
                  rows={8}
                />
                
                <div className="editor-tools">
                  <button 
                    className="tool-btn"
                    onClick={() => setDiagnosis(prev => prev + '\n\n• ')}
                  >
                    📝 نقطة جديدة
                  </button>
                  <button 
                    className="tool-btn"
                    onClick={() => setDiagnosis(prev => prev + '\n\n💊 ')}
                  >
                    💊 وصفة دوائية
                  </button>
                  <button 
                    className="tool-btn"
                    onClick={() => setDiagnosis(prev => prev + '\n\n📋 ')}
                  >
                    📋 تعليمات
                  </button>
                  <button 
                    className="tool-btn"
                    onClick={() => setDiagnosis('')}
                  >
                    🗑️ مسح الكل
                  </button>
                </div>
              </div>

              {/* Print Preview */}
              <div className="print-preview" ref={printRef}>
                <div className="preview-header">
                  <h4>👁️ معاينة قبل الطباعة</h4>
                  <button 
                    className="btn btn-small"
                    onClick={handlePrint}
                  >
                    🖨️ طباعة المعاينة
                  </button>
                </div>
                <div className="preview-content">
                  <div className="preview-patient">
                    <h5>المريض: {createPatient.name}</h5>
                    <p>رقم الهوية: {createPatient.idintity}</p>
                  </div>
                  <div className="preview-diagnosis">
                    <h5>التشخيص:</h5>
                    <div className="diagnosis-preview">
                      {diagnosis.split('\n').map((line, i) => (
                        <p key={i}>{line || <br />}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setCreateModalOpen(false)}
                disabled={generating}
              >
                إلغاء
              </button>
              <button 
                className="btn btn-primary"
                onClick={saveReport}
                disabled={generating || !diagnosis.trim()}
              >
                {generating ? (
                  <>
                    <span className="spinner-small"></span>
                    جاري الإنشاء...
                  </>
                ) : (
                  '💾 حفظ وطباعة التقرير'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {editingTemplate && (
        <div className="modal-overlay">
          <div className="modal-container small">
            <div className="modal-header">
              <h3>✏️ تعديل قالب التشخيص</h3>
              <button 
                className="modal-close"
                onClick={() => setEditingTemplate(null)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>اسم القالب</label>
                <input
                  type="text"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({
                    ...editingTemplate,
                    name: e.target.value
                  })}
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label>التصنيف</label>
                <select
                  value={editingTemplate.category}
                  onChange={(e) => setEditingTemplate({
                    ...editingTemplate,
                    category: e.target.value
                  })}
                  className="form-input"
                >
                  <option value="عام">عام</option>
                  <option value="جهاز تنفسي">جهاز تنفسي</option>
                  <option value="قلب وأوعية">قلب وأوعية</option>
                  <option value="غدد صماء">غدد صماء</option>
                  <option value="عظام">عظام</option>
                  <option value="أعصاب">أعصاب</option>
                  <option value="جلدية">جلدية</option>
                  <option value="جهاز هضمي">جهاز هضمي</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>محتوى القالب</label>
                <textarea
                  value={editingTemplate.content}
                  onChange={(e) => setEditingTemplate({
                    ...editingTemplate,
                    content: e.target.value
                  })}
                  className="form-textarea"
                  rows={6}
                />
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setEditingTemplate(null)}
              >
                إلغاء
              </button>
              <button 
                className="btn btn-primary"
                onClick={updateTemplate}
              >
                💾 حفظ التغييرات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Report Modal */}
      {(viewHtmlContent || viewPdfPath) && (
        <div className="modal-overlay">
          <div className="modal-container large">
            <div className="modal-header">
              <h3>{viewModalTitle}</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setViewHtmlContent(null);
                  setViewPdfPath(null);
                  setViewModalTitle(null);
                }}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              {viewPdfPath ? (
                <iframe 
                  src={viewPdfPath} 
                  className="report-frame"
                  title="PDF Viewer"
                />
              ) : viewHtmlContent ? (
                <iframe 
                  srcDoc={viewHtmlContent} 
                  className="report-frame"
                  title="HTML Report"
                />
              ) : null}
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn"
                onClick={() => {
                  const url = viewPdfPath || `data:text/html,${encodeURIComponent(viewHtmlContent || '')}`;
                  window.open(url, '_blank');
                }}
              >
                🖨️ طباعة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewReports;