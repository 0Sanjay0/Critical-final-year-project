import { Link } from 'react-router-dom';
import { ShieldCheck, QrCode, Stethoscope, FileText, ArrowRight, Activity } from 'lucide-react';

const FEATURES = [
  { icon: QrCode,       color: 'bg-blue-50 text-blue-600',    title: 'Emergency QR Access',      desc: 'Every patient gets a permanent QR code. First responders instantly access critical data — no login required.' },
  { icon: ShieldCheck,  color: 'bg-emerald-50 text-emerald-600', title: 'Verified Professionals', desc: 'Doctors, hospitals, and labs go through admin verification before accessing patient data.' },
  { icon: Stethoscope,  color: 'bg-violet-50 text-violet-600',  title: 'Appointment Management', desc: 'Book appointments with verified doctors, share records, and receive prescriptions digitally.' },
  { icon: FileText,     color: 'bg-amber-50 text-amber-600',    title: 'Unified Medical Records', desc: 'Prescriptions, lab reports, and documents — all in one secure, role-gated place.' },
];

const ROLES = [
  { role: 'Patient',  color: 'border-blue-200 hover:border-blue-400 hover:bg-blue-50',       dot: 'bg-blue-500',    desc: 'Manage your health profile, QR code & appointments' },
  { role: 'Doctor',   color: 'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50', dot: 'bg-emerald-500', desc: 'View patient records & send prescriptions' },
  { role: 'Hospital', color: 'border-violet-200 hover:border-violet-400 hover:bg-violet-50',  dot: 'bg-violet-500',  desc: 'Emergency patient access & coordination' },
  { role: 'Lab',      color: 'border-amber-200 hover:border-amber-400 hover:bg-amber-50',     dot: 'bg-amber-500',   desc: 'Upload diagnostic reports directly to patients' },
];

const HomePage = () => (
  <div className="overflow-hidden">
    {/* Hero */}
    <section className="relative bg-white border-b border-slate-100">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:40px_40px] opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-blue-50/60" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-20 sm:pb-28 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-8">
          <Activity size={13} /> Healthcare Management System
        </div>
        <h1 className="font-display text-3xl sm:text-5xl lg:text-7xl font-bold text-slate-900 leading-[1.1] tracking-tight mb-5">
          Your health records,<br />
          <span className="text-primary-600">always accessible.</span>
        </h1>
        <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto mb-8 leading-relaxed px-2">
          Critical connects patients, doctors, hospitals, and labs on one secure platform.
          From routine appointments to emergency QR access.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/register" className="btn-primary btn btn-lg gap-2">Create free account <ArrowRight size={18} /></Link>
          <Link to="/login"    className="btn-secondary btn btn-lg">Sign in</Link>
        </div>
        <div className="mt-10 sm:mt-16 grid grid-cols-3 gap-4 sm:gap-8 max-w-lg mx-auto">
          {[['5 Roles','Patient to Admin'],['QR Access','Zero login needed'],['Secure','JWT + Role guards']].map(([v,l]) => (
            <div key={v} className="text-center">
              <p className="font-display font-bold text-2xl text-slate-900">{v}</p>
              <p className="text-xs text-slate-400 mt-0.5">{l}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Features */}
    <section className="py-24 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl font-bold text-slate-900 mb-3">Everything in one place</h2>
          <p className="text-slate-400 max-w-xl mx-auto">Built for real healthcare workflows.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 stagger">
          {FEATURES.map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="card p-6 animate-fade-in hover:-translate-y-1 transition-transform duration-200">
              <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center mb-4`}><Icon size={22} /></div>
              <h3 className="font-display font-semibold text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Roles */}
    <section className="py-24 bg-white border-t border-slate-100">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl font-bold text-slate-900 mb-3">Built for every role</h2>
          <p className="text-slate-400">Register with your role and get a tailored experience.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 stagger">
          {ROLES.map(({ role, color, dot, desc }) => (
            <Link key={role} to="/register"
              className={`card p-5 border-2 transition-all duration-200 cursor-pointer ${color} animate-fade-in`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                <span className="font-display font-semibold text-slate-900">{role}</span>
              </div>
              <p className="text-sm text-slate-500 pl-5">{desc}</p>
            </Link>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link to="/register" className="btn-primary btn btn-lg">Get started — it's free <ArrowRight size={18} /></Link>
        </div>
      </div>
    </section>
  </div>
);

export default HomePage;
