import React from 'react';

interface ThoughtIconProps {
  className?: string;
  size?: number;
}

/**
 * Official Reasoning / DeepSeek R1 / Apple Intelligence Vector Icon
 */
export const ThoughtIcon: React.FC<ThoughtIconProps> = ({
  className = 'w-3.5 h-3.5',
  size = 14,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Official 4-point reasoning spark icon */}
      <path
        d="M8 1C8.2 4.5 11.5 7.8 15 8C11.5 8.2 8.2 11.5 8 15C7.8 11.5 4.5 8.2 1 8C4.5 7.8 7.8 4.5 8 1Z"
        fill="currentColor"
      />
      <circle cx="13" cy="3" r="1" fill="currentColor" opacity="0.6" />
      <circle cx="3" cy="13" r="0.8" fill="currentColor" opacity="0.4" />
    </svg>
  );
};
