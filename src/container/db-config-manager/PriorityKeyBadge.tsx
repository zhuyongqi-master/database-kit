import React from 'react';
import { IconX } from '@tabler/icons-react';

interface PriorityKeyBadgeProps {
  keyName: string;
  onRemove: () => void;
}

const PriorityKeyBadge: React.FC<PriorityKeyBadgeProps> = ({ keyName, onRemove }) => {
  return (
    <div className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm">
      <span className="mr-1">{keyName}</span>
      <button
        type="button"
        onClick={onRemove}
        className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-200 hover:bg-blue-300"
      >
        <IconX size={12} />
      </button>
    </div>
  );
};

export default PriorityKeyBadge; 