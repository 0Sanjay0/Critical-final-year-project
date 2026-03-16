import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute  from './ProtectedRoute';
import RoleRoute       from './RoleRoute';
import PublicLayout    from '../layouts/PublicLayout';
import DashboardLayout from '../layouts/DashboardLayout';

// Public
import HomePage      from '../pages/public/HomePage';
import LoginPage     from '../pages/public/LoginPage';
import RegisterPage  from '../pages/public/RegisterPage';
import EmergencyPage from '../pages/public/EmergencyPage';

// Shared
import QRScannerPage from '../pages/shared/QRScannerPage';

// Patient
import PatientDashboard   from '../pages/patient/PatientDashboard';
import PatientProfile     from '../pages/patient/PatientProfile';
import MedicalInfo        from '../pages/patient/MedicalInfo';
import UploadRecords      from '../pages/patient/UploadRecords';
import MyQRCode           from '../pages/patient/MyQRCode';
import BookAppointment    from '../pages/patient/BookAppointment';
import AppointmentHistory from '../pages/patient/AppointmentHistory';

// Doctor
import DoctorDashboard    from '../pages/doctor/DoctorDashboard';
import DoctorHospital     from '../pages/doctor/DoctorHospital';
import DoctorProfile      from '../pages/doctor/DoctorProfile';
import DoctorAppointments from '../pages/doctor/DoctorAppointments';
import PatientDetails     from '../pages/doctor/PatientDetails';
import SendPrescription   from '../pages/doctor/SendPrescription';

// Hospital
import HospitalDashboard     from '../pages/hospital/HospitalDashboard';
import HospitalAppointments from '../pages/hospital/HospitalAppointments';
import ManageDoctors         from '../pages/hospital/ManageDoctors';
import HospitalProfile   from '../pages/hospital/HospitalProfile';

// Lab
import LabDashboard  from '../pages/lab/LabDashboard';
import LabProfile    from '../pages/lab/LabProfile';
import UploadReport  from '../pages/lab/UploadReport';

// Admin
import AdminDashboard  from '../pages/admin/AdminDashboard';
import VerifyDoctors   from '../pages/admin/VerifyDoctors';
import VerifyHospitals from '../pages/admin/VerifyHospitals';
import VerifyLabs      from '../pages/admin/VerifyLabs';
import ManageUsers     from '../pages/admin/ManageUsers';
import EmergencyLogs   from '../pages/admin/EmergencyLogs';

const DASH = {
  patient:'/patient/dashboard', doctor:'/doctor/dashboard',
  hospital:'/hospital/dashboard', lab:'/lab/dashboard', admin:'/admin/dashboard',
};
const DashboardRedirect = () => {
  const { user } = useAuth();
  return <Navigate to={DASH[user?.role] || '/login'} replace />;
};

const AppRouter = () => (
  <Routes>
    {/* Public routes */}
    <Route element={<PublicLayout />}>
      <Route path="/"         element={<HomePage />} />
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/emergency/:qrId" element={<EmergencyPage />} />
    </Route>

    {/* QR Scanner — accessible to all (no auth required) */}
    <Route path="/scan-qr" element={<QRScannerPage />} />

    <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />

    {/* Patient */}
    <Route path="/patient" element={
      <ProtectedRoute><RoleRoute roles={['patient']}><DashboardLayout /></RoleRoute></ProtectedRoute>
    }>
      <Route path="dashboard"        element={<PatientDashboard />} />
      <Route path="profile"          element={<PatientProfile />} />
      <Route path="medical-info"     element={<MedicalInfo />} />
      <Route path="records"          element={<UploadRecords />} />
      <Route path="qr-code"          element={<MyQRCode />} />
      <Route path="book-appointment" element={<BookAppointment />} />
      <Route path="appointments"     element={<AppointmentHistory />} />
    </Route>

    {/* Doctor */}
    <Route path="/doctor" element={
      <ProtectedRoute><RoleRoute roles={['doctor']}><DashboardLayout /></RoleRoute></ProtectedRoute>
    }>
      <Route path="dashboard"                     element={<DoctorDashboard />} />
      <Route path="profile"                       element={<DoctorProfile />} />
      <Route path="appointments"                  element={<DoctorAppointments />} />
      <Route path="appointments/:id"              element={<PatientDetails />} />
      <Route path="appointments/:id/prescription" element={<SendPrescription />} />
      <Route path="hospital"                       element={<DoctorHospital />} />
    </Route>

    {/* Hospital */}
    <Route path="/hospital" element={
      <ProtectedRoute><RoleRoute roles={['hospital']}><DashboardLayout /></RoleRoute></ProtectedRoute>
    }>
      <Route path="dashboard" element={<HospitalDashboard />} />
      <Route path="profile"        element={<HospitalProfile />} />
      <Route path="appointments"   element={<HospitalAppointments />} />
      <Route path="doctors"          element={<ManageDoctors />} />
    </Route>

    {/* Lab */}
    <Route path="/lab" element={
      <ProtectedRoute><RoleRoute roles={['lab']}><DashboardLayout /></RoleRoute></ProtectedRoute>
    }>
      <Route path="dashboard"     element={<LabDashboard />} />
      <Route path="profile"       element={<LabProfile />} />
      <Route path="upload-report" element={<UploadReport />} />
    </Route>

    {/* Admin */}
    <Route path="/admin" element={
      <ProtectedRoute><RoleRoute roles={['admin']}><DashboardLayout /></RoleRoute></ProtectedRoute>
    }>
      <Route path="dashboard"        element={<AdminDashboard />} />
      <Route path="verify/doctors"   element={<VerifyDoctors />} />
      <Route path="verify/hospitals" element={<VerifyHospitals />} />
      <Route path="verify/labs"      element={<VerifyLabs />} />
      <Route path="users"            element={<ManageUsers />} />
      <Route path="emergency-logs"   element={<EmergencyLogs />} />
    </Route>

    <Route path="*" element={
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <p className="font-display text-7xl font-bold text-slate-200">404</p>
        <p className="text-slate-500">Page not found</p>
        <a href="/" className="btn-primary btn">Go Home</a>
      </div>
    } />
  </Routes>
);

export default AppRouter;
