import type { CodeSymbol, SupportedLanguage } from './types';

/**
 * High-speed multi-language signature parser
 * Extracts definitions, exported symbols, and function/class headers with accurate block ranges
 */
export class ASTParser {
  /**
   * Extract symbols from file source code
   */
  public parseSymbols(code: string, language: SupportedLanguage): {
    symbols: CodeSymbol[];
    imports: string[];
    exports: string[];
  } {
    const lines = code.split('\n');
    const symbols: CodeSymbol[] = [];
    const imports: string[] = [];
    const exports: string[] = [];

    switch (language) {
      case 'typescript':
      case 'javascript':
        this.parseTypeScript(lines, symbols, imports, exports);
        break;
      case 'python':
        this.parsePython(lines, symbols, imports, exports);
        break;
      case 'rust':
        this.parseRust(lines, symbols, imports, exports);
        break;
      case 'go':
        this.parseGo(lines, symbols, imports, exports);
        break;
      default:
        this.parseGeneric(lines, symbols);
        break;
    }

    return { symbols, imports, exports };
  }

  /**
   * Helper to find closing brace for block scopes (C-style languages)
   */
  private findClosingBrace(lines: string[], startIndex: number): number {
    let braceCount = 0;
    let foundOpen = false;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      for (const ch of line) {
        if (ch === '{') {
          braceCount++;
          foundOpen = true;
        } else if (ch === '}') {
          braceCount--;
          if (foundOpen && braceCount === 0) {
            return i + 1;
          }
        }
      }
      // If single-line statement (like type alias ending in ;)
      if (!foundOpen && line.trim().endsWith(';')) {
        return i + 1;
      }
    }
    return startIndex + 1;
  }

  private parseTypeScript(
    lines: string[],
    symbols: CodeSymbol[],
    imports: string[],
    exports: string[]
  ) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNum = i + 1;

      // Imports
      if (line.startsWith('import ')) {
        const importMatch = line.match(/import\s+(?:\{([^}]+)\}|\*\s+as\s+(\w+)|(\w+))\s+from\s+['"]([^'"]+)['"]/);
        if (importMatch) {
          imports.push(importMatch[4]);
        }
        continue;
      }

      const isExported = line.startsWith('export ');

      // 1. Interface
      const ifaceMatch = line.match(/(?:export\s+)?interface\s+([A-Za-z0-9_]+)/);
      if (ifaceMatch) {
        const endLine = this.findClosingBrace(lines, i);
        symbols.push({
          name: ifaceMatch[1],
          kind: 'interface',
          signature: line.replace(/\{$/, '').trim(),
          startLine: lineNum,
          endLine,
          isExported,
        });
        if (isExported) exports.push(ifaceMatch[1]);
        continue;
      }

      // 2. Type alias
      const typeMatch = line.match(/(?:export\s+)?type\s+([A-Za-z0-9_]+)/);
      if (typeMatch) {
        const endLine = this.findClosingBrace(lines, i);
        symbols.push({
          name: typeMatch[1],
          kind: 'type',
          signature: line.replace(/;$/, '').trim(),
          startLine: lineNum,
          endLine,
          isExported,
        });
        if (isExported) exports.push(typeMatch[1]);
        continue;
      }

      // 3. Enum
      const enumMatch = line.match(/(?:export\s+)?enum\s+([A-Za-z0-9_]+)/);
      if (enumMatch) {
        const endLine = this.findClosingBrace(lines, i);
        symbols.push({
          name: enumMatch[1],
          kind: 'enum',
          signature: line.replace(/\{$/, '').trim(),
          startLine: lineNum,
          endLine,
          isExported,
        });
        if (isExported) exports.push(enumMatch[1]);
        continue;
      }

      // 4. Class
      const classMatch = line.match(/(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z0-9_]+)/);
      if (classMatch) {
        const endLine = this.findClosingBrace(lines, i);
        symbols.push({
          name: classMatch[1],
          kind: 'class',
          signature: line.replace(/\{$/, '').trim(),
          startLine: lineNum,
          endLine,
          isExported,
        });
        if (isExported) exports.push(classMatch[1]);
        continue;
      }

      // 5. Function
      const funcMatch = line.match(
        /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/
      );
      if (funcMatch) {
        const endLine = this.findClosingBrace(lines, i);
        symbols.push({
          name: funcMatch[1],
          kind: 'function',
          signature: line.replace(/\{$/, '').trim(),
          startLine: lineNum,
          endLine,
          isExported,
        });
        if (isExported) exports.push(funcMatch[1]);
        continue;
      }

      // 6. Arrow Function / Const Component
      const arrowMatch = line.match(
        /(?:export\s+)?const\s+([A-Za-z0-9_]+)\s*[:=]\s*(?:React\.FC<[^>]+>|(?:\([^)]*\)|[A-Za-z0-9_]+)\s*=>)/
      );
      if (arrowMatch) {
        const endLine = this.findClosingBrace(lines, i);
        symbols.push({
          name: arrowMatch[1],
          kind: 'function',
          signature: line.replace(/\{$/, '').trim(),
          startLine: lineNum,
          endLine,
          isExported,
        });
        if (isExported) exports.push(arrowMatch[1]);
        continue;
      }
    }
  }

  private parsePython(
    lines: string[],
    symbols: CodeSymbol[],
    imports: string[],
    exports: string[]
  ) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const lineNum = i + 1;

      if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
        imports.push(trimmed);
        continue;
      }

      // Calculate Python block end via indent
      const getPythonBlockEnd = (startIdx: number, baseIndent: number): number => {
        for (let j = startIdx + 1; j < lines.length; j++) {
          const l = lines[j];
          if (!l.trim()) continue; // skip blank lines
          const indent = l.search(/\S/);
          if (indent !== -1 && indent <= baseIndent) {
            return j;
          }
        }
        return lines.length;
      };

      const currentIndent = line.search(/\S/);

      // Class
      const classMatch = trimmed.match(/^class\s+([A-Za-z0-9_]+)/);
      if (classMatch) {
        const endLine = getPythonBlockEnd(i, currentIndent);
        symbols.push({
          name: classMatch[1],
          kind: 'class',
          signature: trimmed.replace(/:$/, ''),
          startLine: lineNum,
          endLine,
          isExported: true,
        });
        exports.push(classMatch[1]);
        continue;
      }

      // Def function
      const defMatch = trimmed.match(/^def\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/);
      if (defMatch) {
        const endLine = getPythonBlockEnd(i, currentIndent);
        symbols.push({
          name: defMatch[1],
          kind: currentIndent > 0 ? 'method' : 'function',
          signature: trimmed.replace(/:$/, ''),
          startLine: lineNum,
          endLine,
          isExported: !defMatch[1].startsWith('_'),
        });
        if (!defMatch[1].startsWith('_')) exports.push(defMatch[1]);
        continue;
      }
    }
  }

  private parseRust(
    lines: string[],
    symbols: CodeSymbol[],
    imports: string[],
    exports: string[]
  ) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNum = i + 1;

      if (line.startsWith('use ')) {
        imports.push(line);
        continue;
      }

      const isPub = line.startsWith('pub ');

      // Struct
      const structMatch = line.match(/(?:pub\s+)?struct\s+([A-Za-z0-9_]+)/);
      if (structMatch) {
        const endLine = this.findClosingBrace(lines, i);
        symbols.push({
          name: structMatch[1],
          kind: 'struct',
          signature: line.replace(/\{$/, '').trim(),
          startLine: lineNum,
          endLine,
          isExported: isPub,
        });
        if (isPub) exports.push(structMatch[1]);
        continue;
      }

      // Enum
      const enumMatch = line.match(/(?:pub\s+)?enum\s+([A-Za-z0-9_]+)/);
      if (enumMatch) {
        const endLine = this.findClosingBrace(lines, i);
        symbols.push({
          name: enumMatch[1],
          kind: 'enum',
          signature: line.replace(/\{$/, '').trim(),
          startLine: lineNum,
          endLine,
          isExported: isPub,
        });
        if (isPub) exports.push(enumMatch[1]);
        continue;
      }

      // Trait
      const traitMatch = line.match(/(?:pub\s+)?trait\s+([A-Za-z0-9_]+)/);
      if (traitMatch) {
        const endLine = this.findClosingBrace(lines, i);
        symbols.push({
          name: traitMatch[1],
          kind: 'interface',
          signature: line.replace(/\{$/, '').trim(),
          startLine: lineNum,
          endLine,
          isExported: isPub,
        });
        if (isPub) exports.push(traitMatch[1]);
        continue;
      }

      // Fn
      const fnMatch = line.match(/(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z0-9_]+)/);
      if (fnMatch) {
        const endLine = this.findClosingBrace(lines, i);
        symbols.push({
          name: fnMatch[1],
          kind: 'function',
          signature: line.replace(/\{$/, '').trim(),
          startLine: lineNum,
          endLine,
          isExported: isPub,
        });
        if (isPub) exports.push(fnMatch[1]);
        continue;
      }
    }
  }

  private parseGo(
    lines: string[],
    symbols: CodeSymbol[],
    imports: string[],
    exports: string[]
  ) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNum = i + 1;

      if (line.startsWith('import ')) {
        imports.push(line);
        continue;
      }

      // Func
      const funcMatch = line.match(/^func\s+(?:\([^)]+\)\s+)?([A-Za-z0-9_]+)/);
      if (funcMatch) {
        const endLine = this.findClosingBrace(lines, i);
        const name = funcMatch[1];
        const isExported = name[0] === name[0].toUpperCase();
        symbols.push({
          name,
          kind: 'function',
          signature: line.replace(/\{$/, '').trim(),
          startLine: lineNum,
          endLine,
          isExported,
        });
        if (isExported) exports.push(name);
        continue;
      }

      // Type struct / interface
      const typeMatch = line.match(/^type\s+([A-Za-z0-9_]+)\s+(struct|interface)/);
      if (typeMatch) {
        const endLine = this.findClosingBrace(lines, i);
        const name = typeMatch[1];
        const isExported = name[0] === name[0].toUpperCase();
        symbols.push({
          name,
          kind: typeMatch[2] === 'struct' ? 'struct' : 'interface',
          signature: line.replace(/\{$/, '').trim(),
          startLine: lineNum,
          endLine,
          isExported,
        });
        if (isExported) exports.push(name);
        continue;
      }
    }
  }

  private parseGeneric(lines: string[], symbols: CodeSymbol[]) {
    for (let i = 0; i < Math.min(lines.length, 30); i++) {
      const line = lines[i].trim();
      if (line.startsWith('#') || line.startsWith('//') || line.startsWith('/*')) {
        symbols.push({
          name: line.slice(0, 40),
          kind: 'constant',
          signature: line,
          startLine: i + 1,
          endLine: i + 1,
          isExported: false,
        });
      }
    }
  }
}
