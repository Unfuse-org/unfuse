import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-diff';

export function SyntaxSnippet({ text, language = 'json', className = '' }: { text: string; language?: string; className?: string }) {
  const grammar = Prism.languages[language];
  return <pre className={`text-[11px] leading-6 whitespace-pre-wrap break-words font-mono ${className}`}><code>{grammar ? <span dangerouslySetInnerHTML={{ __html: Prism.highlight(text, grammar, language) }} /> : text}</code></pre>;
}
