// // src/services/db.js

// const SqlService = {
//     loadScript: (src, globalKey) => new Promise((resolve) => {
//       if (window[globalKey]) return resolve();
//       const script = document.createElement('script');
//       script.src = src;
//       script.onload = resolve;
//       document.head.appendChild(script);
//     }),
  
//     init: async () => {
//       await SqlService.loadScript("https://cdn.jsdelivr.net/npm/alasql@4.4.0/dist/alasql.min.js", "alasql");
  
//       try {
//         window.alasql(`CREATE TABLE IF NOT EXISTS users (uid STRING PRIMARY KEY, fullName STRING, role STRING, username STRING, matricNumber STRING, faculty STRING, department STRING, level STRING, createdAt DATETIME)`);
//         window.alasql(`CREATE TABLE IF NOT EXISTS courses (id STRING PRIMARY KEY, code STRING, name STRING, lecturerId STRING, lecturerName STRING, createdAt DATETIME)`);
//         window.alasql(`CREATE TABLE IF NOT EXISTS enrollments (id STRING PRIMARY KEY, studentId STRING, studentName STRING, matricNumber STRING, courseId STRING, courseName STRING, enrolledAt DATETIME)`);
//         window.alasql(`CREATE TABLE IF NOT EXISTS attendance (id STRING PRIMARY KEY, courseId STRING, courseName STRING, studentId STRING, studentName STRING, studentMatric STRING, lecturerId STRING, status STRING, sessionDate STRING, timestamp DATETIME)`);
//       } catch(e){ console.error(e) }
  
//       // Restore persisted tables
//       const saved = localStorage.getItem('attendance_sql_data');
//       if (saved) {
//         try { window.alasql.tables = JSON.parse(saved); } catch(e){ console.warn('restore fail', e) }
//       }
//     },
  
//     query: (sql, params = []) => {
//       try {
//         if (!window.alasql) return [];
//         const result = window.alasql(sql, params);
//         const up = sql.trim().toUpperCase();
//         if (up.startsWith('INSERT') || up.startsWith('UPDATE') || up.startsWith('DELETE')) {
//           localStorage.setItem('attendance_sql_data', JSON.stringify(window.alasql.tables));
//         }
//         return result;
//       } catch (e) { console.error('SQL', e); return []; }
//     },
  
//     registerUser: (user) => {
//       SqlService.query(`INSERT INTO users VALUES (?,?,?,?,?,?,?,?,?)`, [
//         user.uid, user.fullName, user.role, user.username,
//         user.matricNumber || '', user.faculty || '', user.department || '', user.level || '100', new Date().toISOString()
//       ]);
//     },
  
//     loginUser: (username) => {
//       return SqlService.query(`SELECT * FROM users WHERE username = ?`, [username])[0];
//     },
  
//     createCourse: (course) => {
//       SqlService.query(`INSERT INTO courses VALUES (?,?,?,?,?,?)`, [
//         course.id, course.code, course.name, course.lecturerId, course.lecturerName, new Date().toISOString()
//       ]);
//     },
  
//     markAttendance: (record) => {
//       SqlService.query(`INSERT INTO attendance VALUES (?,?,?,?,?,?,?,?,?,?)`, [
//         record.id, record.courseId, record.courseName, record.studentId,
//         record.studentName, record.studentMatric, record.lecturerId, record.status || 'present',
//         record.sessionDate, new Date().toISOString()
//       ]);
//     }
//   };
  
//   export default SqlService;
  