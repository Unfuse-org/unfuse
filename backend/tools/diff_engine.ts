import * as Diff from 'diff';

export interface DiffResult {
  unifiedDiff: string;
  addedLines: number;
  removedLines: number;
  isEqual: boolean;
}

/**
 * Generates a unified diff string between old and new text
 */
export function createUnifiedDiff(
  fileName: string,
  oldContent: string,
  newContent: string,
  contextLines = 3
): DiffResult {
  if (oldContent === newContent) {
    return {
      unifiedDiff: '',
      addedLines: 0,
      removedLines: 0,
      isEqual: true,
    };
  }

  const patch = Diff.createTwoFilesPatch(
    `a/${fileName}`,
    `b/${fileName}`,
    oldContent,
    newContent,
    '',
    '',
    { context: contextLines }
  );

  const changes = Diff.diffLines(oldContent, newContent);
  let addedLines = 0;
  let removedLines = 0;

  for (const change of changes) {
    if (change.added) {
      addedLines += change.count || 0;
    } else if (change.removed) {
      removedLines += change.count || 0;
    }
  }

  return {
    unifiedDiff: patch,
    addedLines,
    removedLines,
    isEqual: false,
  };
}

/**
 * Replaces exact target block with replacement content inside a file string
 */
export function applyTargetReplacement(
  originalText: string,
  targetContent: string,
  replacementContent: string,
  allowMultiple = false
): { success: boolean; newContent?: string; error?: string } {
  if (!originalText.includes(targetContent)) {
    // Try normalizing line endings (\r\n -> \n)
    const usedCrlf = originalText.includes('\r\n');
    const normalizedOrig = originalText.replace(/\r\n/g, '\n');
    const normalizedTarget = targetContent.replace(/\r\n/g, '\n');
    const normalizedReplacement = replacementContent.replace(/\r\n/g, '\n');

    if (!normalizedOrig.includes(normalizedTarget)) {
      return {
        success: false,
        error: 'Target content was not found in the file. Ensure whitespace and line numbers match exactly.',
      };
    }

    if (!allowMultiple) {
      const firstIndex = normalizedOrig.indexOf(normalizedTarget);
      const secondIndex = normalizedOrig.indexOf(normalizedTarget, firstIndex + 1);
      if (secondIndex !== -1) {
        return {
          success: false,
          error: 'Multiple occurrences of target content found. Please provide more surrounding context or line numbers.',
        };
      }
      let newContent =
        normalizedOrig.slice(0, firstIndex) +
        normalizedReplacement +
        normalizedOrig.slice(firstIndex + normalizedTarget.length);
      if (usedCrlf) newContent = newContent.replace(/\n/g, '\r\n');
      return { success: true, newContent };
    }

    let newContent = normalizedOrig.replaceAll(normalizedTarget, normalizedReplacement);
    if (usedCrlf) newContent = newContent.replace(/\n/g, '\r\n');
    return { success: true, newContent };
  }

  if (!allowMultiple) {
    const firstIndex = originalText.indexOf(targetContent);
    const secondIndex = originalText.indexOf(targetContent, firstIndex + 1);
    if (secondIndex !== -1) {
      return {
        success: false,
        error: 'Multiple occurrences of target content found. Please provide more surrounding context or line numbers.',
      };
    }
    const newContent =
      originalText.slice(0, firstIndex) +
      replacementContent +
      originalText.slice(firstIndex + targetContent.length);
    return { success: true, newContent };
  }

  const newContent = originalText.replaceAll(targetContent, replacementContent);
  return { success: true, newContent };
}
