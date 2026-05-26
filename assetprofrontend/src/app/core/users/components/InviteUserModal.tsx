'use client';

import { useState } from 'react';
import { X, Mail, User, Send } from 'lucide-react';
import { usersApi } from '@/lib/api/core';
import { extractErrorMessage } from '@/lib/utils';

interface InviteUserModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function InviteUserModal({ open, onClose, onSuccess }: InviteUserModalProps) {
  const [formData, setFormData] = useState({ name: '', email: '', userType: 'EMPLOYEE' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;
    try {
      setSubmitting(true);
      setError(null);
      const result = await usersApi.invite(formData);
      setSuccessMsg(result.message);
      onSuccess?.();
      setTimeout(() => {
        setSuccessMsg(null);
        setFormData({ name: '', email: '', userType: 'EMPLOYEE' });
        onClose();
      }, 2000);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to send invitation'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', email: '', userType: 'EMPLOYEE' });
    setError(null);
    setSuccessMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-card rounded-xl shadow-xl border w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Invite User</h2>
          </div>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            An invitation email will be sent. The recipient sets their own password when they accept.
          </p>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              {successMsg}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Full Name <span className="text-destructive">*</span></label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                required
                className="w-full pl-9 pr-4 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g. John Doe"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email Address <span className="text-destructive">*</span></label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                required
                className="w-full pl-9 pr-4 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g. john@company.com"
                value={formData.email}
                onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">User Type</label>
            <select
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={formData.userType}
              onChange={(e) => setFormData((f) => ({ ...f, userType: e.target.value }))}
            >
              <option value="EMPLOYEE">Employee</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.name.trim() || !formData.email.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
