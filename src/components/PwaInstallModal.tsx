import React from 'react';
import { Share, PlusSquare, Smartphone, Laptop, CheckCircle2, Download } from 'lucide-react';
import { Modal, Button } from './ui';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
  onNativeInstall?: () => void;
  canNativeInstall?: boolean;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  isIOS,
  onNativeInstall,
  canNativeInstall,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Install S&A CRM App"
      description="Run Shameer & Associates CRM as a native standalone app on your desktop or phone."
      size="md"
    >
      <div className="space-y-4 py-1">
        {/* Brand identity header */}
        <div className="p-3.5 rounded-lg bg-subtle border border-line flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-lg bg-ink flex items-center justify-center text-ink-fg font-bold text-base shadow-sm shrink-0">
            SA
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-fg truncate">
              Shameer &amp; Associates CRM
            </div>
            <div className="text-xs text-fg-subtle truncate">
              Accountants and Practitioners · Progressive Web App
            </div>
          </div>
        </div>

        {/* Instructions based on platform */}
        {canNativeInstall ? (
          <div className="space-y-3">
            <p className="text-sm text-fg-muted leading-relaxed">
              Click the button below to install the application directly onto your system. It launches in a dedicated window with fast offline caching and desktop shortcuts.
            </p>
            <div className="pt-2">
              <Button
                variant="primary"
                icon={Download}
                onClick={() => {
                  onNativeInstall?.();
                  onClose();
                }}
                className="w-full justify-center h-9"
              >
                Install Now
              </Button>
            </div>
          </div>
        ) : isIOS ? (
          <div className="space-y-3.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              Install on iPhone or iPad (Safari)
            </div>
            <ol className="space-y-2.5 text-xs text-fg-muted">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-subtle text-fg border border-line flex items-center justify-center font-medium shrink-0 text-2xs mt-0.5">
                  1
                </span>
                <span>
                  Tap the <strong className="text-fg font-semibold">Share</strong> button{' '}
                  <Share className="inline-block w-3.5 h-3.5 text-accent mx-0.5 align-text-bottom" /> in Safari's bottom navigation bar.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-subtle text-fg border border-line flex items-center justify-center font-medium shrink-0 text-2xs mt-0.5">
                  2
                </span>
                <span>
                  Scroll down the share sheet and tap{' '}
                  <strong className="text-fg font-semibold">"Add to Home Screen"</strong>{' '}
                  <PlusSquare className="inline-block w-3.5 h-3.5 text-fg mx-0.5 align-text-bottom" />.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-subtle text-fg border border-line flex items-center justify-center font-medium shrink-0 text-2xs mt-0.5">
                  3
                </span>
                <span>
                  Tap <strong className="text-fg font-semibold">"Add"</strong> in the top-right corner. The S&amp;A icon will appear on your home screen.
                </span>
              </li>
            </ol>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              Desktop Chrome / Edge / Android
            </div>
            <p className="text-xs text-fg-muted leading-relaxed">
              Look for the <strong className="text-fg font-semibold">Install</strong> icon (<Download className="inline-block w-3 h-3 text-accent mx-0.5" />) in your browser address bar (top-right in Chrome/Edge, or in the browser menu ⋮ on mobile), then click <strong className="text-fg font-semibold">Install</strong>.
            </p>
          </div>
        )}

        {/* Benefits list */}
        <div className="pt-2 border-t border-line space-y-2">
          <div className="text-2xs uppercase tracking-wider font-semibold text-fg-subtle">
            PWA Capabilities
          </div>
          <div className="grid grid-cols-2 gap-2 text-2xs text-fg-muted">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
              <span>Full-screen window</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
              <span>Offline shell caching</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
              <span>Instant desktop launch</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
              <span>Quick task shortcuts</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
