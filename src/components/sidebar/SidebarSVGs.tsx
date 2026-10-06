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

// Official Dashboard SVG (Official SF Symbols square.grid.2x2)
export const DashboardIcon: React.FC<{ size?: number; className?: string }> = ({
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
    <rect x="2" y="2" width="5" height="5" rx="1.25" stroke="currentColor" strokeWidth="1.25" />
    <rect x="9" y="2" width="5" height="5" rx="1.25" stroke="currentColor" strokeWidth="1.25" />
    <rect x="2" y="9" width="5" height="5" rx="1.25" stroke="currentColor" strokeWidth="1.25" />
    <rect x="9" y="9" width="5" height="5" rx="1.25" stroke="currentColor" strokeWidth="1.25" />
  </svg>
);

// Official Integrations SVG (Official SF Symbols puzzlepiece.extension)
export const IntegrationsIcon: React.FC<{ size?: number; className?: string }> = ({
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
      d="M7 2a1 1 0 0 1 2 0v1h2.5A1.5 1.5 0 0 1 13 4.5V7h-1a1 1 0 1 0 0 2h1v2.5a1.5 1.5 0 0 1-1.5 1.5H9v-1a1 1 0 1 0-2 0v1H4.5A1.5 1.5 0 0 1 3 11.5V9h1a1 1 0 0 0 0-2H3V4.5A1.5 1.5 0 0 1 4.5 3H7V2Z"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinejoin="round"
    />
  </svg>
);

// Official Library SVG (Official SF Symbols books.vertical)
export const LibraryIcon: React.FC<{ size?: number; className?: string }> = ({
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
    <rect x="2" y="2.5" width="3" height="11" rx="0.75" stroke="currentColor" strokeWidth="1.25" />
    <rect x="6.5" y="2.5" width="3" height="11" rx="0.75" stroke="currentColor" strokeWidth="1.25" />
    <path
      d="M11 3.25L13.75 4.5V13.75L11 12.5V3.25Z"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinejoin="round"
    />
    <line x1="3.25" y1="5.5" x2="3.75" y2="5.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    <line x1="7.75" y1="5.5" x2="8.25" y2="5.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
  </svg>
);

// INDUSTRY-STANDARD 24x24 SOLID (FILLED) ICONS
export const HomeFilledIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 20,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
    <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.432z" />
  </svg>
);

export const DashboardFilledIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 20,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="3" y="3" width="8" height="8" rx="2" />
    <rect x="13" y="3" width="8" height="8" rx="2" />
    <rect x="3" y="13" width="8" height="8" rx="2" />
    <rect x="13" y="13" width="8" height="8" rx="2" />
  </svg>
);

// Official SquaresPlus (Integrations / Extensions) - 3 modular blocks + connection plus
export const IntegrationsFilledIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 20,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M6 3a3 3 0 0 0-3 3v2.25a3 3 0 0 0 3 3h2.25a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3H6ZM15.75 3a3 3 0 0 0-3 3v2.25a3 3 0 0 0 3 3H18a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3h-2.25ZM6 12.75a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h2.25a3 3 0 0 0 3-3v-2.25a3 3 0 0 0-3-3H6ZM17.25 12.75a.75.75 0 0 1 .75.75v2.25H20.25a.75.75 0 0 1 0 1.5H18v2.25a.75.75 0 0 1-1.5 0V17.25H14.25a.75.75 0 0 1 0-1.5h2.25V13.5a.75.75 0 0 1 .75-.75Z" />
  </svg>
);

export const LibraryFilledIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 20,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
  </svg>
);

export const SettingsFilledIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 20,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.14 5.374a1.875 1.875 0 00-2.282.819l-.92 1.59a1.875 1.875 0 00.416 2.385l1.011.833c.095.078.146.219.11.391a7.496 7.496 0 000 1.134c.036.172-.015.313-.11.391l-1.011.834a1.875 1.875 0 00-.416 2.384l.92 1.591a1.875 1.875 0 002.282.818l1.177-.516c.116-.043.284-.032.45.083.318.22.648.411.986.57.182.088.277.228.297.349l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.337-.158.667-.35.985-.57.167-.114.335-.125.45-.082l1.178.516a1.875 1.875 0 002.282-.818l.92-1.591a1.875 1.875 0 00-.415-2.384l-1.012-.834c-.095-.078-.146-.219-.11-.391a7.487 7.487 0 000-1.134c-.036-.172.015-.313.11-.391l1.012-.833a1.875 1.875 0 00.415-2.385l-.92-1.59a1.875 1.875 0 00-2.282-.819l-1.178.516c-.115.043-.283.032-.45-.083a7.49 7.49 0 00-.985-.57c-.183-.088-.278-.228-.297-.349l-.178-1.071A1.875 1.875 0 0012.922 2.25h-1.844zM12 15a3 3 0 100-6 3 3 0 000 6z"
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
