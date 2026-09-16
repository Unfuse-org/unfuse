import React from 'react';

interface LanguageIconProps {
  language: string;
  className?: string;
  size?: number;
}

export const LanguageIcon: React.FC<LanguageIconProps> = ({
  language,
  className = 'w-4 h-4',
  size = 16,
}) => {
  const clean = (language || '').toLowerCase().replace(/^(language-|lang-)/, '');

  switch (clean) {
    case 'typescript':
    case 'ts':
    case 'tsx':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <rect width="32" height="32" rx="6" fill="#3178C6" />
          <path
            d="M17.8 13.2H12.2V16H14.1C16.8 16 18.2 17.1 18.2 19.3C18.2 21.7 16.5 22.8 13.9 22.8C12.1 22.8 10.7 22.2 9.8 21.3L11.1 19.1C11.8 19.8 12.8 20.3 13.9 20.3C15 20.3 15.6 19.8 15.6 19.2C15.6 18.5 15.1 18.1 13.6 18.1H12.2V10.8H17.8V13.2Z"
            fill="white"
            transform="translate(13, 0) scale(0.65)"
          />
          <path
            d="M5 13H15M10 13V24"
            stroke="white"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18 20.5C18.8 21.5 20.2 22.2 21.8 22.2C23.8 22.2 25 21.1 25 19.6C25 18 23.8 17.2 21.2 16.5C19 15.8 18.2 15.1 18.2 13.8C18.2 12.3 19.5 11.2 21.4 11.2C22.8 11.2 24 11.8 24.8 12.6M18 11.5"
            stroke="white"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'javascript':
    case 'js':
    case 'jsx':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <rect width="32" height="32" rx="6" fill="#F7DF1E" />
          <path
            d="M13.5 13.5V21.5C13.5 23.5 11.5 24 10 23.5M19 14C19 14 20 13 22 13C24 13 25.5 14.5 25.5 16.5C25.5 20.5 19 20 19 22.5C19 23.5 20 24 22 24C24 24 25.5 23 25.5 23"
            stroke="#161618"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'python':
    case 'py':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <path
            d="M15.8 4C10.5 4 10.8 6.3 10.8 6.3L10.8 8.7H16.1V9.5H8.7C6.4 9.5 4 11.2 4 16.2C4 21.1 6 21.2 6 21.2H8V18.3C8 14.9 10.8 14.8 10.8 14.8H16.1C19.2 14.8 19.5 12.5 19.5 12.5V6.3C19.5 6.3 19.6 4 15.8 4ZM12.7 6C13.3 6 13.8 6.5 13.8 7.1C13.8 7.7 13.3 8.2 12.7 8.2C12.1 8.2 11.6 7.7 11.6 7.1C11.6 6.5 12.1 6 12.7 6Z"
            fill="#3776AB"
          />
          <path
            d="M16.2 28C21.5 28 21.2 25.7 21.2 25.7V23.3H15.9V22.5H23.3C25.6 22.5 28 20.8 28 15.8C28 10.9 26 10.8 26 10.8H24V13.7C24 17.1 21.2 17.2 21.2 17.2H15.9C12.8 17.2 12.5 19.5 12.5 19.5V25.7C12.5 25.7 12.4 28 16.2 28ZM19.3 26C18.7 26 18.2 25.5 18.2 24.9C18.2 24.3 18.7 23.8 19.3 23.8C19.9 23.8 20.4 24.3 20.4 24.9C20.4 25.5 19.9 26 19.3 26Z"
            fill="#FFD43B"
          />
        </svg>
      );

    case 'rust':
    case 'rs':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <rect width="32" height="32" rx="6" fill="#000000" />
          <circle cx="16" cy="16" r="11" stroke="#DEA584" strokeWidth="2.5" strokeDasharray="2 1.5" />
          <path
            d="M11 12H17C19 12 20.5 13 20.5 14.8C20.5 16.2 19.5 17.2 18 17.5L21.5 22H18.5L15.5 18H13.5V22H11V12ZM13.5 14V16H16.5C17.5 16 18 15.5 18 15C18 14.5 17.5 14 16.5 14H13.5Z"
            fill="#DEA584"
          />
        </svg>
      );

    case 'go':
    case 'golang':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <rect width="32" height="32" rx="6" fill="#00ADD8" />
          <path
            d="M7 16C7 12 10 9 14 9C17 9 19.5 11 20 13H16.5C16 12 15 11.5 14 11.5C11.5 11.5 9.5 13.5 9.5 16C9.5 18.5 11.5 20.5 14 20.5C16 20.5 17 19.5 17.5 18.5H14V16.5H20.5V19C19.5 21.5 17 23 14 23C10 23 7 20 7 16Z"
            fill="white"
          />
          <path
            d="M23 11H25.5V23H23V11Z"
            fill="white"
          />
        </svg>
      );

    case 'bash':
    case 'sh':
    case 'shell':
    case 'zsh':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <rect width="32" height="32" rx="6" fill="#24292E" />
          <path
            d="M9 11L15 16L9 21"
            stroke="#4EAA25"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1="16"
            y1="21"
            x2="23"
            y2="21"
            stroke="#4EAA25"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'json':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <rect width="32" height="32" rx="6" fill="#292D3E" />
          <path
            d="M11 9C9.5 9 9 10 9 11.5V14C9 15 8 15.5 7 16C8 16.5 9 17 9 18V20.5C9 22 9.5 23 11 23M21 9C22.5 9 23 10 23 11.5V14C23 15 24 15.5 25 16C24 16.5 23 17 23 18V20.5C23 22 22.5 23 21 23"
            stroke="#CBCB41"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'html':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <rect width="32" height="32" rx="6" fill="#E34F26" />
          <path
            d="M7 6L9 25L16 27L23 25L25 6H7ZM21.5 11H12.5L12.8 14H21.2L20.5 21.5L16 22.8L11.5 21.5L11.2 18H13.7L13.9 19.8L16 20.4L18.1 19.8L18.4 16.5H10.5L9.8 8.5H22.2L21.5 11Z"
            fill="white"
          />
        </svg>
      );

    case 'css':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <rect width="32" height="32" rx="6" fill="#1572B6" />
          <path
            d="M7 6L9 25L16 27L23 25L25 6H7ZM21.5 11H12.5L12.8 14H21.2L20.5 21.5L16 22.8L11.5 21.5L11.2 18H13.7L13.9 19.8L16 20.4L18.1 19.8L18.4 16.5H10.5L9.8 8.5H22.2L21.5 11Z"
            fill="white"
          />
        </svg>
      );

    case 'markdown':
    case 'md':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <rect width="32" height="32" rx="6" fill="#1E293B" stroke="#475569" strokeWidth="1.5" />
          <path
            d="M7 21V11L11 16L15 11V21M19 16L22 12L25 16M22 12V21"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'sql':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <rect width="32" height="32" rx="6" fill="#336791" />
          <ellipse cx="16" cy="10" rx="8" ry="3.5" fill="none" stroke="white" strokeWidth="2.2" />
          <path d="M8 10V16C8 18 11.5 19.5 16 19.5C20.5 19.5 24 18 24 16V10" stroke="white" strokeWidth="2.2" />
          <path d="M8 16V22C8 24 11.5 25.5 16 25.5C20.5 25.5 24 24 24 22V16" stroke="white" strokeWidth="2.2" />
        </svg>
      );

    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <rect width="32" height="32" rx="6" fill="#27272A" />
          <path
            d="M12 11L7 16L12 21M20 11L25 16L20 21M17 9L15 23"
            stroke="#A1A1AA"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
};
