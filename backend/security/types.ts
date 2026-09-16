/**
 * Security Engine Types for Unit 01
 */

export type PathPermission = 'allow' | 'deny' | 'prompt';

export interface SecurityViolation {
  rule: 'path_traversal' | 'destructive_command' | 'loop_detection';
  target: string;
  reason: string;
  timestamp: number;
}

export interface PathCheckResult {
  allowed: boolean;
  resolvedPath: string;
  violation?: SecurityViolation;
}

export interface CommandCheckResult {
  allowed: boolean;
  sanitizedCommand: string;
  violation?: SecurityViolation;
}
