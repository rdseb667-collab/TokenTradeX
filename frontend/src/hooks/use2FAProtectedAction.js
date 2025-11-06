import { useState } from 'react';
import TwoFactorPrompt from '../components/TwoFactorPrompt';

/**
 * Hook to handle API calls that require 2FA verification
 * 
 * Usage:
 * const { execute2FA, TwoFactorDialog } = use2FAProtectedAction();
 * 
 * const handleCreateAdmin = async () => {
 *   await execute2FA(async (token) => {
 *     return api.post('/auth/create-admin', data, {
 *       headers: { 'X-2FA-Token': token }
 *     });
 *   });
 * };
 * 
 * return (
 *   <>
 *     <Button onClick={handleCreateAdmin}>Create Admin</Button>
 *     <TwoFactorDialog />
 *   </>
 * );
 */
export function use2FAProtectedAction() {
  const [open, setOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [actionTitle, setActionTitle] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const execute2FA = (action, title, message) => {
    return new Promise((resolve, reject) => {
      setActionTitle(title || '2FA Verification Required');
      setActionMessage(message || 'This action requires two-factor authentication.');
      setPendingAction(() => async (token) => {
        try {
          const result = await action(token);
          resolve(result);
          setOpen(false);
        } catch (error) {
          reject(error);
          setOpen(false);
        }
      });
      setOpen(true);
    });
  };

  const handleSubmit = (token) => {
    if (pendingAction) {
      pendingAction(token);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setPendingAction(null);
  };

  const TwoFactorDialog = () => {
    return (
      <TwoFactorPrompt
        open={open}
        onClose={handleClose}
        onSubmit={handleSubmit}
        title={actionTitle}
        message={actionMessage}
      />
    );
  };

  return { execute2FA, TwoFactorDialog };
}

export default use2FAProtectedAction;
