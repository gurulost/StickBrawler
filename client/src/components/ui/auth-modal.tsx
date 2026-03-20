import { useState } from "react";
import { useAuth } from "@/lib/stores/useAuth";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./dialog";
import { Label } from "./label";
import { Input } from "./input";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login, register, error, status, clearError } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    clearError();

    if (mode === "register") {
      if (password !== confirmPassword) {
        setLocalError("Passwords do not match");
        return;
      }
      if (password.length < 6) {
        setLocalError("Password must be at least 6 characters");
        return;
      }
      if (username.length < 3) {
        setLocalError("Username must be at least 3 characters");
        return;
      }
    }

    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        await register(username, password);
      }
      onClose();
      setUsername("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setLocalError("");
    clearError();
  };

  const handleClose = () => {
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setLocalError("");
    clearError();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-ink-dark border-white/5">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-white">
            {mode === "login" ? "Sign In" : "Create Account"}
          </DialogTitle>
          <DialogDescription className="font-tech text-xs text-white/30">
            {mode === "login"
              ? "Sign in to save your progress and compete on the leaderboard"
              : "Create an account to unlock features and track your progress"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="font-tech text-xs text-white/50 uppercase tracking-wider">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              autoComplete="username"
              className="bg-white/5 border-white/8 text-white font-tech placeholder:text-white/15 focus:border-[#00f0ff]/30 focus:ring-[#00f0ff]/10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="font-tech text-xs text-white/50 uppercase tracking-wider">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="bg-white/5 border-white/8 text-white font-tech placeholder:text-white/15 focus:border-[#00f0ff]/30 focus:ring-[#00f0ff]/10"
            />
          </div>

          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="font-tech text-xs text-white/50 uppercase tracking-wider">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                required
                autoComplete="new-password"
                className="bg-white/5 border-white/8 text-white font-tech placeholder:text-white/15 focus:border-[#00f0ff]/30 focus:ring-[#00f0ff]/10"
              />
            </div>
          )}

          {(error || localError) && (
            <div className="text-xs font-tech text-[#ff2d7b] bg-[#ff2d7b]/5 border border-[#ff2d7b]/10 p-3 clip-angular-sm">
              {localError || error}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full clip-angular py-3 font-tech font-bold uppercase tracking-wider text-sm text-black transition hover:scale-[1.02] disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #00f0ff, #39ff14)',
              boxShadow: '0 0 16px rgba(0, 240, 255, 0.2)',
            }}
          >
            {status === "loading"
              ? "Please wait..."
              : mode === "login"
              ? "Sign In"
              : "Create Account"}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={switchMode}
              className="font-tech text-[10px] text-[#00f0ff]/60 hover:text-[#00f0ff] uppercase tracking-wider"
            >
              {mode === "login"
                ? "Don't have an account? Register"
                : "Already have an account? Login"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
