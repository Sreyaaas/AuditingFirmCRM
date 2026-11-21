import React from 'react';
import { Phone, Users, ArrowRight } from 'lucide-react';
import { Badge, Button, Modal } from './ui';
import { PhoneRecipientOption } from '../utils/whatsapp';

export interface SelectRecipientModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: React.ReactNode;
  clientName?: string;
  options: PhoneRecipientOption[];
  onSelect: (option: PhoneRecipientOption) => void;
  onSendToGroup?: () => void;
}

export const SelectRecipientModal: React.FC<SelectRecipientModalProps> = ({
  isOpen,
  onClose,
  title = 'Choose recipient',
  description,
  clientName,
  options,
  onSelect,
  onSendToGroup,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      icon={Phone}
      title={title}
      description={
        description || (
          <span>
            {clientName ? <strong>{clientName}</strong> : 'This client'} has multiple contact numbers. Choose which one to message on WhatsApp:
          </span>
        )
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {onSendToGroup && (
            <Button
              variant="secondary"
              icon={Users}
              onClick={() => {
                onClose();
                onSendToGroup();
              }}
            >
              Send to Group
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-2 py-1">
        {options.map((opt, i) => (
          <button
            key={`${opt.phone}-${i}`}
            type="button"
            onClick={() => {
              onClose();
              onSelect(opt);
            }}
            className="w-full text-left p-3 rounded-[6px] border border-line bg-surface hover:bg-hover hover:border-line-strong transition-all flex items-center justify-between group cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <div className="min-w-0 pr-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-fg truncate">
                  {opt.name || opt.label}
                </span>
                <Badge
                  tone={
                    opt.role.toLowerCase().includes('primary')
                      ? 'info'
                      : 'neutral'
                  }
                >
                  {opt.role}
                </Badge>
              </div>
              <div className="text-xs font-mono text-fg-muted mt-1 tracking-tight">
                +{opt.phone}
              </div>
            </div>
            <div className="text-fg-faint group-hover:text-fg transition-colors">
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
};
