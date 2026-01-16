// src/services/pdf.js
import { fetchAttendanceByCourse, fetchCourseSummaryFirestore, fetchEnrollmentsByCourse } from "./firebase";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import "jspdf-autotable";

const PdfService = {

  generateDailyReport: async (course, date, lecturerName) => {
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
    const summaryByDept = await fetchCourseSummaryFirestore(course.id);

    // Flatten the grouped data into a single array
    const allStudents = [];
    Object.keys(summaryByDept).forEach(dept => {
      summaryByDept[dept].forEach(student => {
        allStudents.push(student);
      });
    });

    if (!allStudents.length) {
      toast.error("No enrollment or attendance records found");
      return;
    }

    // Get attendance records to calculate total classes
    const attendance = await fetchAttendanceByCourse(course.id);
    const totalClasses = Array.from(new Set(attendance.map(a => a.date))).length;

    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(`${course.code} - Attendance Summary`, 14, 20);
      doc.setFontSize(12);
      doc.text(`Total Classes: ${totalClasses}`, 14, 30);

      const rows = allStudents.map(s => [
        s.matricNumber,
        s.studentName,
        s.attended,
        `${s.percentage}%`
      ]);

      doc.autoTable({
        startY: 40,
        head: [['Matric No', 'Name', 'Classes Attended', 'Attendance %']],
        body: rows,
        styles: { fontSize: 10 },
        pageBreak: 'auto',
      });

      doc.save(`${course.code}_Summary.pdf`);
    } catch (error) {
      toast.error("Failed to generate PDF. Please try again.");
      console.error("Error generating PDF:", error);
    }
  }
};

export default PdfService;
