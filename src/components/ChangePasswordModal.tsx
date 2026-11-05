import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { changePassword, passwordProblem, MIN_PASSWORD_LENGTH } from '../services/authService';
import { Button, Field, Input, Modal } from './ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  onChanged: () => void;
}

const ChangePasswordForm: React.FC<Props> = ({ onClose, email, onChanged }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) return setError('The new passwords do not match.');
    setBusy(true);
    setError(null);
    const res = await changePassword(email, current, next);
    setBusy(false);
    if (res.error) return setError(res.error);
    onChanged();
    onClose();
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="sm"
      icon={KeyRound}
      title="Change password"
      description={`At least ${MIN_PASSWORD_LENGTH} characters, with letters and numbers.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="change-password-form" disabled={busy}>
            {busy ? 'Saving…' : 'Change Password'}
          </Button>
        </>
      }
    >
      <form id="change-password-form" onSubmit={submit} className="space-y-4">
        {error && <p className="text-sm text-danger">{error}</p>}
        <Field label="Current password" required>
          <Input type="password" required autoFocus autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="New password" required error={next && passwordProblem(next) ? passwordProblem(next) : undefined}>
          <Input type="password" required autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Field label="Confirm new password" required>
          <Input type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
};

export const ChangePasswordModal: React.FC<Props> = (props) => (props.isOpen ? <ChangePasswordForm {...props} /> : null);
