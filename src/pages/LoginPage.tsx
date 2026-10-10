import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, LogIn, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';

export function LoginPage() {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const loggedInUser: UserProfile = res.data.user;
      loginWithToken(res.data.token, loggedInUser);

      if (loggedInUser.onboardingStep === 'details') {
        navigate('/onboarding/details');
      } else {
        navigate('/home');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Invalid email or password. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-6">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 text-xl font-bold text-blue-700 font-display">
            <GraduationCap className="w-6 h-6 text-blue-600" />
            PeerConnect AI
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            Student Sign In
          </h1>
          <p className="text-sm text-slate-600">
            Sign in with your verified email and password
          </p>
        </div>

        {/* Segmented Login / Register Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-200/80 rounded-lg">
          <span className="py-2 text-center text-xs font-semibold bg-white text-slate-900 rounded-md shadow-xs">
            Login
          </span>
          <Link
            to="/register"
            className="py-2 text-center text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            Register (with OTP)
          </Link>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 space-y-6">
          {error && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@vignaniit.edu.in"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              {submitting ? 'Signing In...' : 'Login'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600">
          Don’t have an account yet?{' '}
          <Link to="/register" className="font-semibold text-blue-600 hover:underline">
            Register with Email OTP Verification
          </Link>
        </p>
      </div>
    </div>
  );
}
