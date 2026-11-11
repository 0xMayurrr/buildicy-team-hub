import { useState, useEffect, type FormEvent } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HubStore } from "@/lib/supabase/store";
import type { UserProfile } from "@/lib/supabase/types";

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Sync latest created users & credentials from Supabase on mount
  useEffect(() => {
    HubStore.syncFromSupabase();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please enter both your work email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await HubStore.login(email, password);
      if (res.success && res.user) {
        toast.success(`Welcome back, ${res.user.name}!`);
        onLoginSuccess(res.user);
      } else {
        setErrorMsg(res.error || "Invalid credentials. Please verify your email and password.");
        toast.error("Sign in failed. Check your email or password.");
      }
    } catch {
      setErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-minimal-shell">
      {/* Background Light Design & Atmosphere */}
      <div className="login-light-backdrop" aria-hidden="true">
        <div className="login-grid-pattern" />
        <div className="login-aurora-beam" />
        <div className="login-ambient-orb login-orb-primary" />
        <div className="login-ambient-orb login-orb-secondary" />
        <div className="login-ambient-orb login-orb-accent" />
        <div className="login-concentric-rings">
          <div className="login-ring ring-1" />
          <div className="login-ring ring-2" />
          <div className="login-ring ring-3" />
        </div>
      </div>

      <div className="login-minimal-card">
        {/* Brand Logo */}
        <div className="login-minimal-brand">
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
            <img
              src="/buildicy-logo.png"
              alt="Buildicy Logo"
              style={{ maxHeight: "54px", maxWidth: "240px", width: "auto", objectFit: "contain" }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/buildicy-mark.png";
              }}
            />
          </div>
          <span className="brand-subtitle">Team Hub · Internal Workspace</span>
        </div>

        {/* Header */}
        <div className="login-minimal-header">
          <h1>Sign in</h1>
          <p>Access your leads, performance metrics and team conversations.</p>
        </div>

        {errorMsg && (
          <div className="login-error-banner" role="alert">
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-minimal-form">
          <div className="minimal-input-group">
            <label htmlFor="login-email">Work email</label>
            <div className="minimal-input-wrapper">
              <Mail className="input-icon-minimal" />
              <Input
                id="login-email"
                type="email"
                required
                placeholder="name@buildicy.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="minimal-input"
              />
            </div>
          </div>

          <div className="minimal-input-group">
            <div className="label-row-minimal">
              <label htmlFor="login-password">Password</label>
              <button
                type="button"
                className="toggle-password-minimal"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{showPassword ? "Hide" : "Show"}</span>
              </button>
            </div>
            <div className="minimal-input-wrapper">
              <Lock className="input-icon-minimal" />
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="minimal-input"
              />
            </div>
          </div>

          <div className="remember-row-minimal">
            <label className="remember-checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Keep me signed in</span>
            </label>
          </div>

          <Button type="submit" className="login-minimal-submit" disabled={isLoading}>
            {isLoading ? (
              <span className="loading-spinner-row">
                <span className="spinner-dot" />
                Authenticating...
              </span>
            ) : (
              <>
                <span>Sign in to workspace</span>
                <ArrowRight size={15} />
              </>
            )}
          </Button>
        </form>

        <div className="login-minimal-footer">
          <ShieldCheck size={13} />
          <span>Role-Based Access Control · Supabase PostgreSQL</span>
        </div>
      </div>
    </div>
  );
}
