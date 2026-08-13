import * as React from 'react';
import { Button, Alert } from '@coaching-os/ui';

interface PublishConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  description: string;
  isLoading?: boolean;
}

export const PublishConfirmModal: React.FC<PublishConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  title,
  description,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-dialog-title"
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
        <h3 id="publish-dialog-title" className="text-lg font-bold text-foreground">
          {title}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>

        <div className="mt-4">
          <Alert variant="warning">
            <span className="font-semibold">Irreversible Action:</span> Once published, content and configurations cannot be modified or un-published.
          </Alert>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="default" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Publishing...' : 'Confirm & Publish'}
          </Button>
        </div>
      </div>
    </div>
  );
};
