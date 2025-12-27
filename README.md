## AttendanceSQL

AttendanceSQL is a role-based attendance management system built with React and Firebase.  
It allows lecturers to create courses, manage attendance using QR codes, and generate reports, while students can enroll in courses, present digital IDs, and track attendance history.

---

## Features

### Lecturer
- Create and manage courses
- Activate / deactivate classes
- Scan student QR codes for attendance
- Prevent duplicate attendance per session
- Generate:
  - Daily attendance reports (PDF)
  - Full course attendance summaries

### Student
- Register and log in securely
- Enroll in available courses
- Generate a digital student ID (QR code)
- View attendance history
- Prevent duplicate enrollments

### Authentication & Security
- Firebase Authentication (Email & Password)
- Email verification required before login
- Password reset / forgot password support
- Firestore security rules enforced
- Duplicate email and matric number prevention
- Role-based access control (Student / Lecturer)

---

## Tech Stack

**Frontend**
- React (Vite)
- Tailwind CSS
- Lucide Icons

**Backend / Services**
- Firebase Authentication
- Cloud Firestore
- Firebase Security Rules

**Utilities**
- QRCode.js
- html5-qrcode
- PDF generation service
- Framer Motion

---

## Project Structure

```txt
src/
├── components/
│   ├── AuthForm.jsx
│   ├── StudentDashboard.jsx
│   ├── LecturerDashboard.jsx
│   ├── LoadingOverlay.jsx
│   ├── FloatingHelpButton.jsx
│   └── HelpModal.jsx
│
├── services/
│   ├── firebase.js
│   ├── db.js
│   ├── courseService.js
│   └── pdf.js
│
├── utils/
│   ├── textFormatters.js
│   ├── firebaseErrors.js
│   ├── withMinDelay.js
│   └── helpers.js
│
├── App.jsx
└── main.jsx

⚙️ Setup & Installation

1. Clone the repository
bash

git clone https://github.com/KabirMarzooq/attendance-sql.git
cd attendance-sql

2. Install dependencies
bash

npm install

3. Firebase Configuration
Create a Firebase project and enable:

Authentication (Email/Password)

Firestore Database

Create a .env file:

env

VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

4. Run the app
bash

npm run dev

  Firestore Rules (Summary)
Users can only write to their own profile

Lecturers can only manage their own courses

Students can only enroll themselves

Attendance cannot be edited or deleted

Duplicate enrollment and attendance is prevented

  Temporary Restrictions
Registration is currently restricted to Engineering students
(Matric numbers must begin with ENG)

This rule can be removed later to allow all faculties

   Known Limitations
No admin dashboard (yet)

No analytics visualization

No offline attendance sync

   Roadmap
Admin role

Course analytics

Push notifications

<!-- Mobile-first PWA support -->