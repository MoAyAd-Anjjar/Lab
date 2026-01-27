import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import * as Neutralino from "@neutralinojs/lib";
declare const NL_PATH: string;

interface Patient {
  idintity: string;
  name: string;
  age: string;
  address: string;
  phone: number;
  notes: string;
  image_path: string;
  insert_date: string;
  update_date: string;
  view_at: string;
}

const ProcessPatients = ({ onBack }: { onBack: () => void }) => {
  const emptyForm: Patient = {
    idintity: "",
    name: "",
    age: "",
    address: "",
    phone: 0,
    notes: "",
    image_path: "",
    insert_date: "",
    update_date: "",
    view_at: "",
  };

  const [patients, setPatients] = useState<Patient[]>([]);
  const [form, setForm] = useState<Patient>(emptyForm);
  const [isEdit, setIsEdit] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const dataFolder = NL_PATH + "/data";
  const savePath = dataFolder + "/patients.xlsx";

  async function selectAndCopyImage(): Promise<string | null> {
    try {
      const result: any = await Neutralino.os.showOpenDialog('اختر صورة', {
        filters: [
          { name: 'Images', extensions: ['jpg', 'png', 'jpeg'] },
        ],
        multiSelections: false,
      });

      let originalPath: string | null = null;
      if (typeof result === 'string') originalPath = result;
      else if (result.selectedEntry) originalPath = result.selectedEntry;
      else if (Array.isArray(result) && result.length > 0) originalPath = result[0];

      if (!originalPath) return null;

      const imagesDir = NL_PATH + "/images";
      try {
        await Neutralino.filesystem.createDirectory(imagesDir);
      } catch { }

      const fileName = "patient_" + Date.now() + "_" + Math.floor(Math.random() * 9999) + ".jpg";
      const newPath = imagesDir + "/" + fileName;
      await Neutralino.filesystem.copy(originalPath, newPath);

      console.log("Saved image to:", newPath);
      return newPath;

    } catch (e) {
      console.error("Image copy failed:", e);
      return null;
    }
  }

  const base64ToUint8Array = (base64: string) => {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  };

  const loadPatients = async () => {
    let workbook: XLSX.WorkBook;

    try {
      const raw: any = await Neutralino.filesystem.readBinaryFile(savePath);
      let bytes: Uint8Array;

      if (typeof raw === "string") bytes = base64ToUint8Array(raw);
      else if (raw instanceof ArrayBuffer) bytes = new Uint8Array(raw);
      else bytes = raw;

      workbook = XLSX.read(bytes, { type: "array" });
    } catch {
      try {
        await Neutralino.filesystem.createDirectory(dataFolder);
      } catch { }

      workbook = XLSX.utils.book_new();
      const header = [
        ["idintity", "name", "age", "address", "phone", "notes", "image_path", "insert_date", "update_date", "view_at"],
      ];
      const sheet = XLSX.utils.aoa_to_sheet(header);
      XLSX.utils.book_append_sheet(workbook, sheet, "Patients");
      const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      await Neutralino.filesystem.writeBinaryFile(savePath, bytes);
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as any[];

    const list: Patient[] = json.map((r: any) => ({
      idintity: r.idintity,
      name: r.name,
      age: r.age,
      address: r.address,
      phone: Number(r.phone),
      notes: r.notes,
      image_path: r.image_path,
      insert_date: r.insert_date,
      update_date: r.update_date,
      view_at: r.view_at,
    }));

    setPatients(list);
  };

  const savePatientsToExcel = async (list: Patient[]) => {
    const sheet = XLSX.utils.json_to_sheet(list);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Patients");
    const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    await Neutralino.filesystem.writeBinaryFile(savePath, bytes);
  };

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!form.name) return alert("اسم المريض مطلوب");
    if (!form.idintity) return alert("رقم الهوية مطلوب");
    if (patients.find((p) => p.idintity === form.idintity) && !isEdit) {
      alert("رقم الهوية مستخدم مسبقاً");
      return;
    }

    let updatedList: Patient[];
    if (isEdit) {
      form.update_date = new Date().toISOString();
      updatedList = patients.map((p) => (p.idintity === form.idintity ? form : p));
    } else {
      const newPatient = {
        ...form,
        insert_date: new Date().toISOString(),
        update_date: "",
        view_at: "",
      };
      updatedList = [...patients, newPatient];
    }

    setPatients(updatedList);
    await savePatientsToExcel(updatedList);
    setForm(emptyForm);
    setIsEdit(false);
  };

  const handleEdit = (p: Patient) => {
    setForm(p);
    setIsEdit(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف المريض برقم الهوية: " + id + "?")) return;
    const updated = patients.filter((p) => p.idintity !== id);
    setPatients(updated);
    await savePatientsToExcel(updated);
  };

  const handleViewPatient = (p: Patient) => {
    setSelectedPatient(p);
  };

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.idintity.includes(searchTerm) ||
    patient.phone.toString().includes(searchTerm)
  );

  useEffect(() => {
    loadPatients();
  }, []);

  return (
    <div style={ui.page}>
      {/* HEADER */}
      <div style={ui.header}>
        <div style={ui.headerContent}>
          <h1 style={ui.headerTitle}>نظام إدارة المرضى</h1>
          <p style={ui.headerSubtitle}>إدارة سجلات المرضى بكل سهولة وأمان</p>
          <button style={ui.btnBack} onClick={onBack}>
            ↩️ رجوع للقائمة الرئيسية
          </button>
        </div>
        <div style={ui.headerStats}>
          <div style={ui.statCard}>
            <span style={ui.statNumber}>{patients.length}</span>
            <span style={ui.statLabel}>إجمالي المرضى</span>
          </div>
        </div>
      </div>

      <div style={ui.content}>
        {/* LEFT FORM */}
        <div style={ui.formSection}>
          <div style={ui.formCard}>
            <div style={ui.cardHeader}>
              <h2 style={ui.cardTitle}>
                {isEdit ? "✏️ تعديل بيانات المريض" : "➕ إضافة مريض جديد"}
              </h2>
              <div style={ui.cardBadge}>
                {isEdit ? "تعديل" : "جديد"}
              </div>
            </div>

            <div style={ui.formGrid}>
              <div style={ui.formGroup}>
                <label style={ui.label}>رقم الهوية *</label>
                <input name="idintity" value={form.idintity} onChange={handleChange} style={ui.input} />
              </div>

              <div style={ui.formGroup}>
                <label style={ui.label}>اسم المريض *</label>
                <input name="name" value={form.name} onChange={handleChange} style={ui.input} />
              </div>

              <div style={ui.formGroup}>
                <label style={ui.label}>العمر</label>
                <input name="age" value={form.age} onChange={handleChange} style={ui.input} />
              </div>

              <div style={ui.formGroup}>
                <label style={ui.label}>رقم الهاتف</label>
                <input name="phone" type="number" value={form.phone} onChange={handleChange} style={ui.input} />
              </div>

              <div style={ui.formGroupFull}>
                <label style={ui.label}>العنوان</label>
                <input name="address" value={form.address} onChange={handleChange} style={ui.input} />
              </div>

              <div style={ui.formGroupFull}>
                <label style={ui.label}>صورة المريض</label>
                <button
                  style={form.image_path ? ui.btnImageSuccess : ui.btnImage}
                  onClick={async () => {
                    const path = await selectAndCopyImage();
                    if (path) {
                      setForm({ ...form, image_path: path });
                    }
                  }}
                >
                  {form.image_path ? "✅ تم اختيار الصورة" : "📷 اختيار صورة المريض"}
                </button>
                {form.image_path && (
                  <div style={ui.imagePreview}>
                    <span style={ui.imagePath}>📁 {form.image_path.split('/').pop()}</span>
                  </div>
                )}
              </div>

              <div style={ui.formGroupFull}>
                <label style={ui.label}>ملاحظات</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} style={ui.textarea} />
              </div>
            </div>

            <div style={ui.formActions}>
              <button style={ui.btnSave} onClick={handleSave}>
                {isEdit ? "🔄 تحديث البيانات" : "💾 حفظ المريض"}
              </button>
              {isEdit && (
                <button style={ui.btnCancel} onClick={() => { setForm(emptyForm); setIsEdit(false); }}>
                  ❌ إلغاء التعديل
                </button>
              )}
            </div>
          </div>


        </div>

        {/* RIGHT TABLE */}
        <div style={ui.tableSection}>
          <div style={ui.tableCard}>
            <div style={ui.tableHeader}>
              <h2 style={ui.cardTitle}>👥 قائمة المرضى</h2>
              <div style={ui.searchBox}>
                <input
                  type="text"
                  placeholder="🔍 بحث بالاسم، الهوية، أو الهاتف..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={ui.searchInput}
                />
              </div>
            </div>

            <div style={ui.tableContainer}>
              <table style={ui.table}>
                <thead style={ui.thead}>
                  <tr>
                    <th style={ui.th}>الهوية</th>
                    <th style={ui.th}>الاسم</th>
                    <th style={ui.th}>العمر</th>
                    <th style={ui.th}>الهاتف</th>
                    <th style={ui.th}>أضيف بتاريخ</th>
                    <th style={{ ...ui.th, textAlign: 'center' }}>العمليات</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPatients.map((p) => (
                    <tr key={p.idintity} style={ui.tr}>
                      <td style={ui.td}>
                        <span style={ui.idBadge}>{p.idintity}</span>
                      </td>
                      <td style={ui.td}>
                        <span style={ui.name}>{p.name}</span>

                      </td>
                      <td style={ui.td}>{p.age}</td>
                      <td style={ui.td}>{p.phone || '-'}</td>
                      <td style={ui.td}>
                        {p.insert_date ? new Date(p.insert_date).toLocaleDateString('en-US') : ''}
                      </td>
                      <td style={ui.td}>
                        <div style={ui.actionButtons}>
                          <button style={ui.btnView} onClick={() => handleViewPatient(p)}>
                            👁️ عرض
                          </button>
                          <button style={ui.btnEdit} onClick={() => handleEdit(p)}>
                            ✏️ تعديل
                          </button>
                          <button style={ui.btnDelete} onClick={() => handleDelete(p.idintity)}>
                            🗑️ حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredPatients.length === 0 && (
                    <tr>
                      <td colSpan={6} style={ui.noData}>
                        {searchTerm ? "❌ لا توجد نتائج للبحث" : "📝 لا يوجد مرضى مسجلين بعد"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={ui.tableFooter}>
              <span style={ui.footerText}>
                عرض {filteredPatients.length} من أصل {patients.length} مريض
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PATIENT DETAILS MODAL */}
      {selectedPatient && (
        <div style={ui.modalOverlay}>
          <div style={ui.modal}>
            <div style={ui.modalHeader}>
              <h2 style={ui.modalTitle}>👤 تفاصيل المريض</h2>
              <button style={ui.modalClose} onClick={() => setSelectedPatient(null)}>✕</button>
            </div>
            <div style={ui.modalContent}>
              <div style={ui.patientDetails}>
                <div style={ui.detailRow}>
                  <span style={ui.detailLabel}>رقم الهوية:</span>
                  <span style={ui.detailValue}>{selectedPatient.idintity}</span>
                </div>
                <div style={ui.detailRow}>
                  <span style={ui.detailLabel}>الاسم:</span>
                  <span style={ui.detailValue}>{selectedPatient.name}</span>
                </div>
                <div style={ui.detailRow}>
                  <span style={ui.detailLabel}>العمر:</span>
                  <span style={ui.detailValue}>{selectedPatient.age}</span>
                </div>
                <div style={ui.detailRow}>
                  <span style={ui.detailLabel}>الهاتف:</span>
                  <span style={ui.detailValue}>{selectedPatient.phone || '-'}</span>
                </div>
                <div style={ui.detailRow}>
                  <span style={ui.detailLabel}>العنوان:</span>
                  <span style={ui.detailValue}>{selectedPatient.address || '-'}</span>
                </div>
                <div style={ui.detailRow}>
                  <span style={ui.detailLabel}>ملاحظات:</span>
                  <span style={ui.detailValue}>{selectedPatient.notes || 'لا توجد ملاحظات'}</span>
                </div>
                {selectedPatient.image_path && (
                  <div style={ui.detailRow}>
                    <span style={ui.detailLabel}>الصورة:</span>
                    <span style={ui.detailValue}>{selectedPatient.image_path}</span>
                    <img
                      src={"file://"+selectedPatient.image_path.replace(/\\/g, "/")}
                      alt="Patient Image"
                      style={ui.detailImage}
                    />                  </div>
                )}
              </div>
            </div>
            <div style={ui.modalActions}>
              <button style={ui.btnEdit} onClick={() => { handleEdit(selectedPatient); setSelectedPatient(null); }}>
                ✏️ تعديل البيانات
              </button>
              <button style={ui.btnCloseModal} onClick={() => setSelectedPatient(null)}>
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ========== SUPER AWESOME UI STYLES ==========
const ui: any = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    fontFamily: '"Tajawal", "Segoe UI", Arial, sans-serif',
  },

  header: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    padding: '20px 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    borderBottom: '1px solid rgba(255,255,255,0.2)',
  },

  headerContent: {
    flex: 1,
  },

  headerTitle: {
    margin: 0,
    fontSize: '28px',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },

  headerSubtitle: {

    color: '#666',
    fontSize: '16px',
  },

  headerStats: {
    display: 'flex',
    gap: '20px',
  },

  statCard: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    padding: '15px 25px',
    borderRadius: '15px',
    textAlign: 'center',
    minWidth: '120px',
    boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
  },

  statNumber: {
    display: 'block',
    fontSize: '32px',
    fontWeight: 'bold',
  },

  statLabel: {
    fontSize: '14px',
    opacity: 0.9,
  },

  content: {
    display: 'flex',
    gap: '25px',
    padding: '25px',
    maxWidth: '1400px',
    margin: '0 auto',
  },

  formSection: {
    flex: '0 0 400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },

  tableSection: {
    flex: 1,
  },

  formCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '25px',
    boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
  },

  tableCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '25px',
    boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    height: 'fit-content',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
  },

  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '25px',
    paddingBottom: '15px',
    borderBottom: '2px solid #f0f0f0',
  },

  cardTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
    color: '#333',
  },

  cardBadge: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    padding: '5px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
  },

  formGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },

  formGroup: {
    flex: 1,
  },

  formGroupFull: {
    width: '100%',
  },

  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#555',
    fontSize: '14px',
  },

  input: {
    width: '100%',
    padding: '12px 15px',
    border: '2px solid #e1e5e9',
    borderRadius: '12px',
    fontSize: '14px',
    transition: 'all 0.3s ease',
    background: '#fff',
    boxSizing: 'border-box',
  },

  textarea: {
    width: '100%',
    padding: '12px 15px',
    border: '2px solid #e1e5e9',
    borderRadius: '12px',
    fontSize: '14px',
    minHeight: '100px',
    resize: 'vertical',
    transition: 'all 0.3s ease',
    background: '#fff',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },

  btnImage: {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },

  btnImageSuccess: {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(135deg, #4CAF50, #45a049)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },

  imagePreview: {
    marginTop: '8px',
    padding: '8px',
    background: '#f8f9fa',
    borderRadius: '8px',
    border: '1px dashed #ddd',
  },

  imagePath: {
    fontSize: '12px',
    color: '#666',
  },

  formActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '20px',
  },

  btnSave: {
    padding: '15px',
    background: 'linear-gradient(135deg, #4CAF50, #45a049)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
  },

  btnCancel: {
    padding: '12px',
    background: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },

  btnBack: {
    padding: '12px',
    background: '#66549bff',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textAlign: 'center',
  },

  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '2px solid #f0f0f0',
  },

  searchBox: {
    flex: '0 0 300px',
  },

  searchInput: {
    width: '90%',
    padding: '12px 15px',
    border: '2px solid #e1e5e9',
    borderRadius: '12px',
    fontSize: '14px',
    background: '#fff',
    direction: 'rtl',
  },

  tableContainer: {
    overflow: 'auto',
    flex: 1,
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },

  thead: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    position: 'sticky',
    top: 0,
  },

  th: {
    padding: '15px 12px',
    textAlign: 'right',
    color: 'white',
    fontWeight: '600',
    fontSize: '14px',
    border: 'none',
  },

  tr: {
    transition: 'all 0.3s ease',
    borderBottom: '1px solid #f0f0f0'

  },

  td: {
    padding: '15px 12px',
    textAlign: 'right',
    fontSize: '14px',
    border: 'none',

  },

  idBadge: {
    background: '#e3f2fd',
    color: '#1976d2',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
  },

  nameCell: {
    display: 'flex',
    alignItems: 'center',
  },

  name: {
    fontWeight: '600',
    color: '#333',
  },

  hasImage: {
    fontSize: '12px',
    opacity: 0.7,
  },

  actionButtons: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
  },

  btnView: {
    padding: '6px 12px',
    background: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },

  btnEdit: {
    padding: '6px 12px',
    background: '#ffc107',
    color: '#212529',
    border: 'none',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },

  btnDelete: {
    padding: '6px 12px',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },

  noData: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#666',
    fontSize: '16px',
  },

  tableFooter: {
    marginTop: '15px',
    paddingTop: '15px',
    borderTop: '1px solid #f0f0f0',
    textAlign: 'center',
  },

  footerText: {
    fontSize: '14px',
    color: '#666',
  },

  // Modal Styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(5px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },

  modal: {
    background: 'white',
    borderRadius: '20px',
    padding: 0,
    maxWidth: '500px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'hidden',
    boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
  },

  modalHeader: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    padding: '20px 25px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  modalTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
  },

  modalClose: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '20px',
    cursor: 'pointer',
    padding: 0,
    width: '30px',
    height: '30px',
  },

  modalContent: {
    padding: '25px',
    maxHeight: '400px',
    overflow: 'auto',
  },

  patientDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },

  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: '12px',
    borderBottom: '1px solid #f0f0f0',
  },

  detailLabel: {
    fontWeight: '600',
    color: '#333',
    minWidth: '100px',
  },

  detailValue: {
    color: '#666',
    textAlign: 'left',
    flex: 1,
  },

  modalActions: {
    padding: '20px 25px',
    background: '#f8f9fa',
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
  },

  btnCloseModal: {
    padding: '10px 20px',
    background: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};

export default ProcessPatients;