// src/services/pdf.js
import { fetchAttendanceByCourse, fetchCourseSummaryFirestore, fetchEnrollmentsByCourse } from "./firebase";

const PdfService = {
  init: async () => {
    // load jspdf and autotable
    if (!window.jspdf) {
      const s1 = document.createElement('script');
      s1.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      document.head.appendChild(s1);
      await new Promise(r => s1.onload = r);
    }
    if (!window.jspdfAutoTable) {
      const s2 = document.createElement('script');
      s2.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js";
      document.head.appendChild(s2);
      await new Promise(r => s2.onload = r);
    }
  },

  generateDailyReport: async (course, date, lecturerName) => {
    if (!window.jspdf) return alert("PDF engine not ready");
    const attendance = await fetchAttendanceByCourse(course.id);
    const records = (attendance || []).filter(r => r.date === date);
    if (!records || records.length === 0) return alert("No records");
    const doc = new window.jspdf.jsPDF();
    doc.setFontSize(18); doc.text(`${course.code} - Attendance Report`, 14, 20);
    doc.setFontSize(12); doc.text(`Date: ${date}`, 14, 30); doc.text(`Lecturer: ${lecturerName}`, 14, 36);
    const tableData = records.map(r => [r.matricNumber, r.fullName, new Date(r.timestamp).toLocaleTimeString(), (r.status || 'present').toUpperCase()]);
    doc.autoTable({ startY: 45, head: [['Matric No', 'Name', 'Time In', 'Status']], body: tableData });
    doc.save(`${course.code}_${date}.pdf`);
  },

  generateSummary: async (course) => {
    if (!window.jspdf) return alert("PDF engine not ready");
    const summary = await fetchCourseSummaryFirestore(course.id);
    const rows = (summary.students || []).map(s => [s.matricNumber, s.studentName, s.attended, `${s.percentage}%`]);
    if (!rows.length) return alert("No classes recorded");
    const doc = new window.jspdf.jsPDF();
    doc.setFontSize(18); doc.text(`${course.code} - Session Summary`, 14, 20);
    doc.text(`Total Classes: ${summary.totalClasses}`, 14, 30);
    doc.autoTable({ startY: 40, head: [['Matric No', 'Name', 'Classes Attended', '%']], body: rows });
    doc.save(`${course.code}_Summary.pdf`);
  }
};

export default PdfService;
