'use client';

import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string; // Optional visible label next to the switch
  srLabel: string; // Required screen-reader label
  disabled?: boolean;
}

export default function Switch({
  checked,
  onChange,
  label,
  srLabel,
  disabled = false
}: SwitchProps) {
  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <label className="inline-flex items-center cursor-pointer" title={label ?? srLabel}>
      <input 
        type="checkbox" 
        className="sr-only peer" 
        checked={checked} 
        onChange={handleToggle} 
        disabled={disabled}
        aria-label={srLabel}
      />
      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
      {label && (
        <span className="ms-3 text-sm font-medium text-gray-900">
          {label}
        </span>
      )}
    </label>
  );
} 