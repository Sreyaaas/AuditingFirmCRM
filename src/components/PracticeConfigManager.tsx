import React, { useState } from 'react';
import { Plus, X, Check, SlidersHorizontal, RefreshCw, AlertCircle } from 'lucide-react';
import { isSupabaseConfigured } from '../services/supabaseClient';

interface PracticeConfigManagerProps {
  configs: Record<string, string[]>;
  onAddOption: (categoryKey: string, newOption: string) => Promise<boolean>;
  onRemoveOption: (categoryKey: string, optionToRemove: string) => Promise<boolean>;
}

export const PracticeConfigManager: React.FC<PracticeConfigManagerProps> = ({
  configs,
  onAddOption,
  onRemoveOption,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('filing_types');
  const [newOptionInput, setNewOptionInput] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const categories = [
    { key: 'filing_types', label: 'Filing Types', description: 'Monthly statutory compliance types (GSTR-1, GSTR-3B, TDS, Audit, etc.)' },
    { key: 'return_types', label: 'GST Returns', description: 'GST Portal Return codes (GSTR-1, GSTR-3B, CMP-08, GSTR-9, etc.)' },
    { key: 'entity_types', label: 'Entity Types', description: 'Legal client structures (Pvt Ltd, LLP, Partnership, Individual, etc.)' },
    { key: 'service_types', label: 'Service Catalog', description: 'Professional services rendered for fee billing & invoicing' },
  ];

  const currentOptions = configs[activeCategory] || [];
  const currentCategoryMeta = categories.find((c) => c.key === activeCategory) || categories[0];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOptionInput.trim()) return;

    setSaving(true);
    setFeedback(null);
    const success = await onAddOption(activeCategory, newOptionInput.trim());
    setSaving(false);

    if (success) {
      setNewOptionInput('');
      setFeedback({ type: 'success', message: `Added "${newOptionInput.trim()}" to ${currentCategoryMeta.label}` });
      setTimeout(() => setFeedback(null), 3000);
    } else {
      setFeedback({ type: 'error', message: 'Option already exists or could not be saved' });
    }
  };

  const handleRemove = async (option: string) => {
    setSaving(true);
    setFeedback(null);
    const success = await onRemoveOption(activeCategory, option);
    setSaving(false);

    if (success) {
      setFeedback({ type: 'success', message: `Removed "${option}" from ${currentCategoryMeta.label}` });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[8px] p-5 space-y-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E5EA] dark:border-[#2C2C2E] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#0071E3] dark:text-[#2997FF] stroke-[1.5]" />
            <h3 className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              Practice Dropdowns &amp; Configurations
            </h3>
          </div>
          <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
            Admin tool: add or modify options for filing types, returns, and entity structures without changing code.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#16A34A] dark:text-[#34C759] bg-[#16A34A]/10 px-2.5 py-1 rounded-[6px]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] dark:bg-[#34C759]"></span>
          <span>{isSupabaseConfigured() ? 'Live Supabase Sync' : 'Local Storage Mode'}</span>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-[#F2F2F7] dark:bg-[#242426] p-1 rounded-[6px]">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => {
              setActiveCategory(cat.key);
              setFeedback(null);
            }}
            className={`px-3 py-1 text-[12px] font-medium rounded-[5px] transition-all ${
              activeCategory === cat.key
                ? 'bg-[#FFFFFF] dark:bg-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-sm'
                : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
            }`}
          >
            {cat.label} ({(configs[cat.key] || []).length})
          </button>
        ))}
      </div>

      <div className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">
        {currentCategoryMeta.description}
      </div>

      {/* Current Options Pill Grid */}
      <div className="flex flex-wrap gap-2 pt-1">
        {currentOptions.map((opt) => (
          <div
            key={opt}
            className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[12.5px] bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7]"
          >
            <span className="font-medium">{opt}</span>
            <button
              onClick={() => handleRemove(opt)}
              disabled={saving || currentOptions.length <= 1}
              className="text-[#86868B] hover:text-[#DC2626] dark:hover:text-[#FF453A] disabled:opacity-30 transition-colors p-0.5 rounded"
              title="Remove option"
            >
              <X className="w-3 h-3 stroke-[2]" />
            </button>
          </div>
        ))}
      </div>

      {/* Add New Option Form */}
      <form onSubmit={handleAdd} className="flex items-center gap-2 pt-2">
        <input
          type="text"
          value={newOptionInput}
          onChange={(e) => setNewOptionInput(e.target.value)}
          placeholder={`Add new ${currentCategoryMeta.label.toLowerCase()} option...`}
          className="flex-1 h-8 px-3 text-[13px] rounded-[6px] bg-[#FAFAFA] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] focus:outline-none focus:border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B]"
        />
        <button
          type="submit"
          disabled={saving || !newOptionInput.trim()}
          className="h-8 px-3 rounded-[6px] bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-50 text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
        >
          {saving ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5 stroke-[2]" />
          )}
          <span>Add Option</span>
        </button>
      </form>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`flex items-center gap-2 p-2 rounded-[6px] text-[12px] animate-in fade-in duration-150 ${
            feedback.type === 'success'
              ? 'bg-[#16A34A]/10 text-[#16A34A] dark:text-[#34C759] border border-[#16A34A]/20'
              : 'bg-[#DC2626]/10 text-[#DC2626] dark:text-[#FF453A] border border-[#DC2626]/20'
          }`}
        >
          {feedback.type === 'success' ? (
            <Check className="w-3.5 h-3.5 shrink-0 stroke-[2]" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 shrink-0 stroke-[2]" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}
    </div>
  );
};
