import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import toast from 'react-hot-toast'

const DASH = {
  patient: '/patient/dashboard',
  doctor: '/doctor/dashboard',
  hospital: '/hospital/dashboard',
  lab: '/lab/dashboard',
  admin: '/admin/dashboard',
}

const LoginPage = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.email) e.email = 'Email is required'
    if (!form.password) e.password = 'Password is required'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) {
      setErrors(e2)
      return
    }
    setLoading(true)
    try {
      const user = await login(form.email.trim(), form.password)
      navigate(from || DASH[user.role] || '/dashboard', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((er) => ({ ...er, [field]: '' }))
  }

  return (
    <div className="min-h-[calc(100vh-130px)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <LogIn size={22} className="text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Welcome back
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Sign in to your Critical account
          </p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="form-group">
              <label className="label">Email address</label>
              <input
                type="email"
                className={`input ${errors.email ? 'input-error' : ''}`}
                value={form.email}
                onChange={set('email')}
                autoComplete="email"
                autoFocus
              />
              {errors.email && <p className="error-msg">{errors.email}</p>}
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                  value={form.password}
                  onChange={set('password')}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password && (
                <p className="error-msg">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary btn w-full btn-lg"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="text-primary-600 font-medium hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}

export default LoginPage
