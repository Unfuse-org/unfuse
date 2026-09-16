import React from 'react';

// Official Home SVG (Official SF Symbols house)
export const HomeIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 14,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M2.5 7.25L8 2.75L13.5 7.25V13.25C13.5 13.6642 13.1642 14 12.75 14H9.5V10.25C9.5 9.83579 9.16421 9.5 8.75 9.5H7.25C6.83579 9.5 6.5 9.83579 6.5 10.25V14H3.25C2.83579 14 2.5 13.6642 2.5 13.25V7.25Z"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Official Square Pen / New Chat SVG (Official SF Symbols square.and.pencil)
export const NewChatIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 15,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z" />
  </svg>
);

// Official Magnifying Glass Search SVG (SF Symbols magnifyingglass)
export const SearchIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 14,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="6.5" cy="6.5" r="4.75" stroke="currentColor" strokeWidth="1.25" />
    <path
      d="M10 10L14 14"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
    />
  </svg>
);

// Official Chat Message Bubble SVG (SF Symbols bubble.left.and.bubble.right)
export const MessageBubbleIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 14,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M2.5 8C2.5 5.23858 4.73858 3 7.5 3C10.2614 3 12.5 5.23858 12.5 8C12.5 10.7614 10.2614 13 7.5 13C6.44473 13 5.46083 12.6738 4.65089 12.1154L2.5 12.75L3.13463 10.5991C2.73041 9.82229 2.5 8.94074 2.5 8Z"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Official Folder Closed SVG (macOS Finder style)
export const FolderIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 14,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M2 4C2 3.44772 2.44772 3 3 3H6L7.5 5H13C13.5523 5 14 5.44772 14 6V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinejoin="round"
    />
  </svg>
);

// Official File Code SVG
export const FileCodeIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 14,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M3.5 2.5C3.5 1.94772 3.94772 1.5 4.5 1.5H9.5L13.5 5.5V13.5C13.5 14.0523 13.0523 14.5 12.5 14.5H4.5C3.94772 14.5 3.5 14.0523 3.5 13.5V2.5Z"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <path d="M9.5 1.5V5.5H13.5" stroke="currentColor" strokeWidth="1.2" />
    <path
      d="M6 8.5L5 9.5L6 10.5M10 8.5L11 9.5L10 10.5"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Official Pin SVG (SF Symbols pin)
export const PinIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 13,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M9.5 2.5L13.5 6.5L11 9L11.5 13.5L8.5 10.5L4.5 14.5L5.5 10.5L2.5 7.5L7 8L9.5 2.5Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Official Trash / Delete SVG (SF Symbols trash)
export const TrashIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 13,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M3 4.5H13M6 4.5V3C6 2.44772 6.44772 2 7 2H9C9.55228 2 10 2.44772 10 3V4.5M4 4.5V13C4 13.5523 4.44772 14 5 14H11C11.5523 14 12 13.5523 12 13V4.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Official Settings Gear SVG (SF Symbols gearshape)
export const SettingsIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 14,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="8" cy="8" r="2.25" stroke="currentColor" strokeWidth="1.25" />
    <path
      d="M8 1.5V3M8 13V14.5M1.5 8H3M13 8H14.5M3.4 3.4L4.5 4.5M11.5 11.5L12.6 12.6M3.4 12.6L4.5 11.5M11.5 4.5L12.6 3.4"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
    />
  </svg>
);

// Chevron Down
export const ChevronDownIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 12,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M4 6L8 10L12 6"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Chevron Right
export const ChevronRightIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 12,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M6 4L10 8L6 12"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
