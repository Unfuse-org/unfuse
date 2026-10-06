import React from 'react';
import {
  siGmail,
  siNotion,
  siGoogledrive,
  siDatadog,
  siJira,
  siPosthog,
  siGithub,
  siLinear,
  siSentry,
  siPostgresql,
  siSupabase,
  siRedis,
  siDocker,
  siFigma,
  siDiscord,
  siBrave,
  siDuckduckgo,
  siGoogle,
} from 'simple-icons';
import { ServiceId } from './types';

interface LogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

// 1. GMAIL (Official 4-Color Google Workspace Vector)
export const GmailLogo: React.FC<LogoProps> = ({ size = 24, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="52 42 88 66"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ width: size, height: size, ...style }}
  >
    <path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6" />
    <path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15" />
    <path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2" />
    <path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92" />
    <path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2" />
  </svg>
);

// 2. NOTION
export const NotionLogo: React.FC<LogoProps> = ({ size = 24, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ width: size, height: size, ...style }}
  >
    <path d={siNotion.path} />
  </svg>
);

// 3. GOOGLE DRIVE (Official Multi-Color Vector)
export const GoogleDriveLogo: React.FC<LogoProps> = ({ size = 24, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 87.3 78"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ width: size, height: size, ...style }}
  >
    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47" />
    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
  </svg>
);

// 4. DATADOG
export const DatadogLogo: React.FC<LogoProps> = ({ size = 24, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={`#${siDatadog.hex}`}
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ width: size, height: size, ...style }}
  >
    <path d={siDatadog.path} />
  </svg>
);

// 5. JIRA
export const JiraLogo: React.FC<LogoProps> = ({ size = 24, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={`#${siJira.hex}`}
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ width: size, height: size, ...style }}
  >
    <path d={siJira.path} />
  </svg>
);

// 6. POSTHOG (Official Multi-Color Hedgehog Vector)
export const PostHogLogo: React.FC<LogoProps> = ({ size = 24, className = '', style }) => (
  <svg
    width={size}
    height={Math.round(size * (28 / 52))}
    viewBox="0 0 52 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ width: size, height: Math.round(size * (28 / 52)), ...style }}
  >
    <path
      d="M.87 19.13a.5.5 0 0 0-.87.34v5.94a2.6 2.6 0 0 0 2.59 2.58H7.8a.5.5 0 0 0 .37-.84zM.86 8.4c-.3-.32-.86-.1-.86.36v6.73q0 .2.13.34l8.81 9.68 1.8 2.06v-8.82zM4.59.82A2.67 2.67 0 0 0 0 2.68v1.93q0 .4.27.69l10.47 10.95v-9.1z"
      fill="#0054ff"
    />
    <path
      d="M11.36 28h7.08a.5.5 0 0 0 .36-.85l-8.05-8.4v8.8l.23.28q.16.17.38.17m-.61-11.76 8.84 9.25 2.1 2.33q.1.11.27.14V18.7L10.75 7.15zm0-13.7v1.41a2 2 0 0 0 .55 1.28L21.96 16.2V7.65L15.32.8a2.67 2.67 0 0 0-4.57 1.71z"
      fill="#ff5506"
    />
    <path
      d="M22.06 28h7.76a.5.5 0 0 0 .36-.86l-8.22-8.45v9.27l.09.02zM31 25.49l1.13 1.14c.32.31.85.09.85-.35v-7.3l-.49-.51L21.96 7.64v8.55zM22.52 5.73l9.62 9.89c.3.32.86.1.86-.35V7.46L26.56.82a2.67 2.67 0 0 0-4.59 1.84v1.7c0 .51.2 1 .57 1.37z"
      fill="#ffb70f"
    />
    <path
      d="m50 23.34-.35-.05A4.5 4.5 0 0 1 47 21.97L35.56 10.1c-.3-.33-.86-.1-.86.35V27.5c0 .27.22.5.5.5h13.78c1.48 0 2.67-1.2 2.67-2.67v-.1a1.9 1.9 0 0 0-1.67-1.89zm-10.81.2a1.8 1.8 0 1 1 0-3.58 1.8 1.8 0 0 1 0 3.58"
      fill="#FFFFFF"
    />
  </svg>
);

// 7. GITHUB
export const GitHubLogo: React.FC<LogoProps> = ({ size = 24, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ width: size, height: size, ...style }}
  >
    <path d={siGithub.path} />
  </svg>
);

// 8. LINEAR
export const LinearLogo: React.FC<LogoProps> = ({ size = 24, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={`#${siLinear.hex}`}
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ width: size, height: size, ...style }}
  >
    <path d={siLinear.path} />
  </svg>
);

// 9. SENTRY
export const SentryLogo: React.FC<LogoProps> = ({ size = 24, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="#FF4664"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ width: size, height: size, ...style }}
  >
    <path d={siSentry.path} />
  </svg>
);

// 10. POSTGRESQL
export const PostgreSQLLogo: React.FC<LogoProps> = ({ size = 24, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={`#${siPostgresql.hex}`}
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ width: size, height: size, ...style }}
  >
    <path d={siPostgresql.path} />
  </svg>
);

// 11. SUPABASE
export const SupabaseLogo: React.FC<LogoProps> = ({ size = 24, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={`#${siSupabase.hex}`}
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ width: size, height: size, ...style }}
  >
    <path d={siSupabase.path} />
  </svg>
);

// 12. REDIS
export const RedisLogo: React.FC<LogoProps> = ({ size = 24, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={`#${siRedis.hex}`}
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ width: size, height: size, ...style }}
  >
    <path d={siRedis.path} />
  </svg>
);

// 13. DOCKER
export const DockerLogo: React.FC<LogoProps> = ({ size = 24, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={`#${siDocker.hex}`}
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ width: size, height: size, ...style }}
  >
    <path d={siDocker.path} />
  </svg>
);

// 14. FIGMA (Official 5-Color Vector)
export const FigmaLogo: React.FC<LogoProps> = ({ size = 24, className = '', style }) => (
  <svg
    width={Math.round(size * (200 / 300))}
    height={size}
    viewBox="0 0 200 300"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ width: Math.round(size * (200 / 300)), height: size, ...style }}
  >
    <path d="M50 300c27.6 0 50-22.4 50-50v-50H50c-27.6 0-50 22.4-50 50s22.4 50 50 50z" fill="#0ACF83" />
    <path d="M0 150c0-27.6 22.4-50 50-50h50v100H50c-27.6 0-50-22.4-50-50z" fill="#A259FF" />
    <path d="M0 50C0 22.4 22.4 0 50 0h50v100H50C22.4 100 0 77.6 0 50z" fill="#F24E1E" />
    <path d="M100 0h50c27.6 0 50 22.4 50 50s-22.4 50-50 50h-50V0z" fill="#FF7262" />
    <path d="M200 150c0 27.6-22.4 50-50 50s-50-22.4-50-50 22.4-50 50-50 50 22.4 50 50z" fill="#1ABCFE" />
  </svg>
);

// 15. DISCORD
export const DiscordLogo: React.FC<LogoProps> = ({ size = 24, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={`#${siDiscord.hex}`}
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ width: size, height: size, ...style }}
  >
    <path d={siDiscord.path} />
  </svg>
);

// 16. DUCKDUCKGO
export const DuckDuckGoLogo: React.FC<LogoProps> = ({ size = 24, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={`#${siDuckduckgo.hex}`}
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ width: size, height: size, ...style }}
  >
    <path d={siDuckduckgo.path} />
  </svg>
);

// 17. BRAVE SEARCH
export const BraveLogo: React.FC<LogoProps> = ({ size = 24, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={`#${siBrave.hex}`}
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ width: size, height: size, ...style }}
  >
    <path d={siBrave.path} />
  </svg>
);

// 18. GOOGLE
export const GoogleLogo: React.FC<LogoProps> = ({ size = 24, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ width: size, height: size, ...style }}
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

// 19. SLACK (Official 4-Color Vector)
export const SlackLogo: React.FC<LogoProps> = ({ size = 24, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 127 127"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ width: size, height: size, ...style }}
  >
    <path
      d="M27.2 80c0 7.3-5.9 13.2-13.2 13.2C6.7 93.2.8 87.3.8 80c0-7.3 5.9-13.2 13.2-13.2h13.2V80zm6.6 0c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2v33c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V80z"
      fill="#E01E5A"
    />
    <path
      d="M47 27c-7.3 0-13.2-5.9-13.2-13.2C33.8 6.5 39.7.6 47 .6c7.3 0 13.2 5.9 13.2 13.2V27H47zm0 6.7c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H13.9C6.6 60.1.7 54.2.7 46.9c0-7.3 5.9-13.2 13.2-13.2H47z"
      fill="#36C5F0"
    />
    <path
      d="M99.9 46.9c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H99.9V46.9zm-6.6 0c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V13.8C66.9 6.5 72.8.6 80.1.6c7.3 0 13.2 5.9 13.2 13.2v33.1z"
      fill="#2EB67D"
    />
    <path
      d="M80.1 99.8c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V99.8h13.2zm0-6.6c-7.3 0-13.2-5.9-13.2-13.2 0-7.3 5.9-13.2 13.2-13.2h33.1c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H80.1z"
      fill="#ECB22E"
    />
  </svg>
);

// 20. TAVILY
export const TavilyLogo: React.FC<LogoProps> = ({ size = 24, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 55 55"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ width: size, height: size, ...style }}
  >
    <path
      d="M23.3863 30.405C23.0885 30.405 22.7934 30.4638 22.5183 30.5782C22.2433 30.6926 21.9933 30.8603 21.7827 31.0716L17.4534 35.4188L16.3029 34.2638C15.4573 33.415 14.0099 33.8346 13.7471 35.0064L12.1073 42.3023C12.0498 42.5532 12.0568 42.8148 12.128 43.0621C12.199 43.3085 12.3313 43.5327 12.5123 43.7136L12.5108 43.7159C12.6915 43.8987 12.9155 44.0321 13.1619 44.1037C13.4083 44.1752 13.6688 44.1824 13.9188 44.1246L21.1862 42.4776C22.3527 42.2137 22.7715 40.7614 21.9259 39.9124L20.7754 38.7574L25.1056 34.411C25.5306 33.9842 25.7695 33.4049 25.7695 32.8013C25.7695 32.1977 25.5306 31.6185 25.1056 31.1916L25.0476 31.1334L25.0497 31.1319L24.9896 31.0716C24.7791 30.8603 24.529 30.6926 24.254 30.5782C23.979 30.4638 23.684 30.4051 23.3863 30.405ZM39.0054 27.6663C37.9941 27.0245 36.6768 27.7546 36.6766 28.9556V30.5884H27.3981C27.7081 31.1832 27.8847 31.8596 27.8847 32.5774C27.8846 33.6152 27.5181 34.5672 26.908 35.3099L36.6758 35.3096L36.6752 36.9424C36.6753 38.1434 37.9941 38.8736 39.0054 38.2319L45.3045 34.2387C45.7757 33.9384 46.0114 33.443 46.0115 32.948C46.0109 32.4536 45.7752 31.9592 45.303 31.6601L39.0054 27.6663ZM23.6104 10.2206C23.3539 10.2194 23.101 10.2839 22.8763 10.4081C22.6514 10.5325 22.4614 10.7132 22.3253 10.9318L18.3472 17.2549H18.3458C17.7067 18.2701 18.4346 19.5933 19.6307 19.5936H21.2578V28.9869C21.9327 28.5406 22.7403 28.2801 23.609 28.2801C24.4781 28.2801 25.2864 28.5407 25.9615 28.9875V19.5936H27.5884C28.7849 19.5936 29.5112 18.2702 28.8728 17.2541L24.8939 10.9318C24.5951 10.4584 24.1029 10.2212 23.6104 10.2206Z"
      fill="#4E75FF"
    />
  </svg>
);

// 21. EXA
export const ExaLogo: React.FC<LogoProps> = ({ size = 24, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ width: size, height: size, ...style }}
  >
    <rect x="3" y="3" width="8" height="8" rx="2" fill="#5B61FD" />
    <rect x="13" y="3" width="8" height="8" rx="2" fill="#5B61FD" opacity="0.75" />
    <rect x="3" y="13" width="8" height="8" rx="2" fill="#5B61FD" opacity="0.5" />
    <rect x="13" y="13" width="8" height="8" rx="2" fill="#5B61FD" />
  </svg>
);

// 22. MCP
export const McpLogo: React.FC<LogoProps> = ({ size = 24, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 195 195"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ width: size, height: size, ...style }}
  >
    <path
      d="M25 97.8528L92.8822 29.9706C102.255 20.598 117.451 20.598 126.823 29.9706V29.9706C136.196 39.3431 136.196 54.5391 126.823 63.9117L75.5581 115.177"
      stroke="currentColor"
      strokeWidth="14"
      strokeLinecap="round"
    />
    <path
      d="M76.2652 114.47L126.823 63.9117C136.196 54.5391 151.392 54.5391 160.765 63.9117L161.118 64.2652C170.491 73.6378 170.491 88.8338 161.118 98.2063L99.7248 159.6C96.6006 162.724 96.6006 167.789 99.7248 170.913L112.331 183.52"
      stroke="currentColor"
      strokeWidth="14"
      strokeLinecap="round"
    />
    <path
      d="M109.853 46.9411L59.6482 97.1457C50.2756 106.518 50.2756 121.714 59.6482 131.087V131.087C69.0208 140.459 84.2167 140.459 93.5893 131.087L143.794 80.8822"
      stroke="currentColor"
      strokeWidth="14"
      strokeLinecap="round"
    />
  </svg>
);

// HELPER RENDER FUNCTION FOR ANY SERVICE ID
export const renderIntegrationLogo = (
  id: ServiceId,
  size = 24,
  className = '',
  style?: React.CSSProperties
): React.ReactNode => {
  switch (id) {
    case 'gmail':
      return <GmailLogo size={size} className={className} style={style} />;
    case 'notion':
      return <NotionLogo size={size} className={className} style={style} />;
    case 'googledrive':
      return <GoogleDriveLogo size={size} className={className} style={style} />;
    case 'datadog':
      return <DatadogLogo size={size} className={className} style={style} />;
    case 'jira':
      return <JiraLogo size={size} className={className} style={style} />;
    case 'posthog':
      return <PostHogLogo size={size} className={className} style={style} />;
    case 'github':
      return <GitHubLogo size={size} className={className} style={style} />;
    case 'linear':
      return <LinearLogo size={size} className={className} style={style} />;
    case 'sentry':
      return <SentryLogo size={size} className={className} style={style} />;
    case 'postgresql':
      return <PostgreSQLLogo size={size} className={className} style={style} />;
    case 'supabase':
      return <SupabaseLogo size={size} className={className} style={style} />;
    case 'redis':
      return <RedisLogo size={size} className={className} style={style} />;
    case 'docker':
      return <DockerLogo size={size} className={className} style={style} />;
    case 'figma':
      return <FigmaLogo size={size} className={className} style={style} />;
    case 'discord':
      return <DiscordLogo size={size} className={className} style={style} />;
    case 'duckduckgo':
      return <DuckDuckGoLogo size={size} className={className} style={style} />;
    case 'brave':
      return <BraveLogo size={size} className={className} style={style} />;
    case 'tavily':
      return <TavilyLogo size={size} className={className} style={style} />;
    case 'exa':
      return <ExaLogo size={size} className={className} style={style} />;
    case 'google':
      return <GoogleLogo size={size} className={className} style={style} />;
    case 'slack':
      return <SlackLogo size={size} className={className} style={style} />;
    case 'mcp':
      return <McpLogo size={size} className={className} style={style} />;
    default:
      return null;
  }
};
