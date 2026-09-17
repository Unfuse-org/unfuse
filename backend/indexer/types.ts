/**
 * Codebase Indexer & AST Types for Unfuse
 */

export type SymbolKind =
  | 'function'
  | 'method'
  | 'class'
  | 'interface'
  | 'type'
  | 'struct'
  | 'enum'
  | 'constant'
  | 'variable';

export type SupportedLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'rust'
  | 'go'
  | 'cpp'
  | 'html'
  | 'css'
  | 'json'
  | 'markdown'
  | 'unknown';

export interface CodeSymbol {
  name: string;
  kind: SymbolKind;
  signature: string;
  startLine: number;
  endLine: number;
  isExported: boolean;
  parentScope?: string;
}

export interface FileIndexRecord {
  path: string;
  relativePath: string;
  language: SupportedLanguage;
  symbols: CodeSymbol[];
  imports: string[];
  exports: string[];
  lineCount: number;
  byteSize: number;
  lastModified: number;
}

export type ModelTier = 'micro' | 'standard' | 'heavy';

export interface RepoMapOptions {
  maxTokens?: number;
  modelTier?: ModelTier;
  focusFiles?: string[];
  focusSymbols?: string[];
}

export interface RepoMapResult {
  formattedMap: string;
  tokenCount: number;
  indexedFilesCount: number;
  totalSymbolsCount: number;
  modelTier: ModelTier;
}

export interface ContextSlice {
  filePath: string;
  startLine: number;
  endLine: number;
  code: string;
  reason?: string;
}
