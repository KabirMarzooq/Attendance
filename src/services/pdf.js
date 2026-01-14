// src/services/pdf.js
import { fetchAttendanceByCourse, fetchCourseSummaryFirestore, fetchEnrollmentsByCourse } from "./firebase";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import "jspdf-autotable";

const PdfService = {
  // init: async () => {
  //   // load jspdf and autotable
  //   if (!window.jspdf) {
  //     const s1 = document.createElement('script');
  //     s1.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
  //     document.head.appendChild(s1);
  //     await new Promise(r => s1.onload = r);
  //   }
  //   if (!window.jspdfAutoTable) {
  //     const s2 = document.createElement('script');
  //     s2.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js";
  //     document.head.appendChild(s2);
  //     await new Promise(r => s2.onload = r);
  //   }
  // },

  generateDailyReport: async (course, date, lecturerName) => {
    // if (!window.jspdf) { toast.error("PDF engine not ready"); return; }
    const attendance = await fetchAttendanceByCourse(course.id);
    const records = (attendance || []).filter(r => r.date === date);
    if (!records || records.length === 0) { toast.error("No records"); return; }
    try {
      const doc = new jsPDF();
      doc.setFontSize(18); doc.text(`${course.code} - Attendance Report`, 14, 20);
      doc.setFontSize(12); doc.text(`Date: ${date}`, 14, 30); doc.text(`Lecturer: ${lecturerName}`, 14, 36);
      const tableData = records.map(r => [r.matricNumber, r.fullName, new Date(r.timestamp).toLocaleTimeString(), (r.status || 'present').toUpperCase()]);
      doc.autoTable({ startY: 45, head: [['Matric No', 'Name', 'Time In', 'Status']], body: tableData, styles: { fontSize: 10 }, pageBreak: 'auto', });
      doc.save(`${course.code}_${date}.pdf`);
    } catch (error) {
      toast.error("Failed to generate PDF. Please try again.");
      console.error("Error generating PDF:", error);
    }
  },

  generateSummary: async (course) => {
    // if (!window.jspdf) { toast.error("PDF engine not ready"); return; }
    const summary = await fetchCourseSummaryFirestore(course.id);
    const rows = (summary.students || []).map(s => [s.matricNumber, s.studentName, s.attended, `${s.percentage}%`]);
    if (!rows.length) { toast.error("No classes recorded"); return; }
    try {
      const doc = new jsPDF();
      doc.setFontSize(18); doc.text(`${course.code} - Attendance Summary`, 14, 20);
      doc.text(`Total Classes: ${summary.totalClasses}`, 14, 30);
      doc.autoTable({ startY: 30, head: [['Matric No', 'Name', 'Classes Attended', 'Attendance %']], body: rows, styles: { fontSize: 10 }, pageBreak: 'auto', });
      doc.save(`${course.code}_Summary.pdf`);
    } catch (error) {
      toast.error("Failed to generate PDF. Please try again.");
      console.error("Error generating PDF:", error);
    }
  }
};

export default PdfService;
