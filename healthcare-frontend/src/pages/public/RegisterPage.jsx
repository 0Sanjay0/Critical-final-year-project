import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLES = [
  { value: 'patient',  label: 'Patient',  desc: 'Manage health records & QR code',  color: 'border-blue-400 bg-blue-50' },
  { value: 'doctor',   label: 'Doctor',   desc: 'Treat patients & send prescriptions', color: 'border-emerald-400 bg-emerald-50' },
  { value: 'hospital', label: 'Hospital', desc: 'Emergency access & coordination',  color: 'border-violet-400 bg-violet-50' },
  { value: 'lab',      label: 'Lab',      desc: 'Upload diagnostic reports',         color: 'border-amber-400 bg-amber-50' },
];

const DASH = {
  patient:'/patient/dashboard', doctor:'/doctor/dashboard',
  hospital:'/hospital/dashboard', lab:'/lab/dashboard',
};

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate     = useNavigate();

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '',
    password: '', confirmPassword: '', phone: '', role: '',
  });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim())  e.lastName  = 'Last name is required';
    if (!form.email.trim())     e.email     = 'Email is required';
    if (!form.role)             e.role      = 'Please select a role';
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setErrors(e2); return; }
    setLoading(true);
    try {
      const { confirmPassword, ...payload } = form;
      const user = await register(payload);
      navigate(DASH[user.role] || '/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setErrors(er => ({ ...er, [field]: '' }));
  };

  return (
    <div className="min-h-[calc(100vh-130px)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <UserPlus size={22} className="text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="text-slate-400 text-sm mt-1">Join Critical — free for all roles</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Role selector */}
            <div className="form-group">
              <label className="label">I am a <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map(({ value, label, desc, color }) => (
                  <button key={value} type="button"
                    onClick={() => { setForm(f => ({ ...f, role: value })); setErrors(er => ({ ...er, role: '' })); }}
                    className={`text-left p-3 rounded-lg border-2 transition-all duration-150 ${
                      form.role === value ? color + ' border-opacity-100' : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}>
                    <p className="text-sm font-semibold text-slate-900">{label}</p>
                    <p className="text-xs text-slate-400 mt-0.5 leading-tight">{desc}</p>
                  </button>
                ))}
              </div>
              {errors.role && <p className="error-msg">{errors.role}</p>}
            </div>

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="label">First name</label>
                <input className={`input ${errors.firstName ? 'input-error' : ''}`}
                  placeholder="John" value={form.firstName} onChange={set('firstName')} />
                {errors.firstName && <p className="error-msg">{errors.firstName}</p>}
              </div>
              <div className="form-group">
                <label className="label">Last name</label>
                <input className={`input ${errors.lastName ? 'input-error' : ''}`}
                  placeholder="Doe" value={form.lastName} onChange={set('lastName')} />
                {errors.lastName && <p className="error-msg">{errors.lastName}</p>}
              </div>
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="label">Email address</label>
              <input type="email" className={`input ${errors.email ? 'input-error' : ''}`}
                placeholder="you@example.com" value={form.email} onChange={set('email')} />
              {errors.email && <p className="error-msg">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div className="form-group">
              <label className="label">Phone <span className="text-slate-400 font-normal">(optional)</span></label>
              <input type="tel" className="input"
                placeholder="+1 234 567 8900" value={form.phone} onChange={set('phone')} />
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'}
                  className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                  placeholder="Min. 8 characters" value={form.password} onChange={set('password')} />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff size={17}/> : <Eye size={17}/>}
                </button>
              </div>
              {errors.password && <p className="error-msg">{errors.password}</p>}
            </div>

            {/* Confirm password */}
            <div className="form-group">
              <label className="label">Confirm password</label>
              <input type="password"
                className={`input ${errors.confirmPassword ? 'input-error' : ''}`}
                placeholder="Re-enter password" value={form.confirmPassword} onChange={set('confirmPassword')} />
              {errors.confirmPassword && <p className="error-msg">{errors.confirmPassword}</p>}
            </div>

            {/* Note for professionals */}
            {['doctor','hospital','lab'].includes(form.role) && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                <strong>Note:</strong> {form.role} accounts require document verification by admin before you can access patient data.
                You'll be able to submit your documents after registration.
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary btn w-full btn-lg">
              {loading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
