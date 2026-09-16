/**
 * High-Entropy Secret Redactor (Gitleaks / Trufflehog Standard Rules)
 * Sanitizes terminal outputs, file dumps, and tool responses before display
 */
export class SecretRedactor {
  private rules: Array<{ pattern: RegExp; replacement: string }> = [
    // GitHub Tokens
    { pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36}\b/g, replacement: '[REDACTED_GITHUB_TOKEN]' },
    { pattern: /\bgithub_pat_[a-zA-Z0-9_]{82}\b/g, replacement: '[REDACTED_GITHUB_PAT]' },

    // OpenAI API Keys
    { pattern: /\bsk-(?:proj-)?[a-zA-Z0-9_-]{32,}\b/g, replacement: '[REDACTED_OPENAI_KEY]' },

    // Anthropic API Keys
    { pattern: /\bsk-ant-[a-zA-Z0-9_-]{32,}\b/g, replacement: '[REDACTED_ANTHROPIC_KEY]' },

    // AWS Access Key ID & Secret
    { pattern: /\bAKIA[0-9A-Z]{16}\b/g, replacement: '[REDACTED_AWS_ACCESS_KEY]' },
    { pattern: /\baws_secret_access_key\s*=\s*['"]?[a-zA-Z0-9/+=]{40}['"]?/gi, replacement: 'aws_secret_access_key="[REDACTED_AWS_SECRET]"' },

    // Slack Webhooks & Bot Tokens
    { pattern: /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]+\/B[a-zA-Z0-9_]+\/[a-zA-Z0-9_]+/g, replacement: '[REDACTED_SLACK_WEBHOOK]' },
    { pattern: /\bxox[baprs]-[a-zA-Z0-9_-]{10,}\b/g, replacement: '[REDACTED_SLACK_TOKEN]' },

    // Private SSH / TLS Keys
    { pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, replacement: '[REDACTED_PRIVATE_KEY]' },

    // Database Connection Strings with Passwords
    { pattern: /(postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s:]+:([^\s@]+)@[^\s\/]+/gi, replacement: '$1://[USER]:[REDACTED_PASSWORD]@[HOST]' },

    // Google Cloud / GCP API Keys
    { pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g, replacement: '[REDACTED_GCP_KEY]' },

    // Stripe Secret Keys
    { pattern: /\bsk_live_[a-zA-Z0-9]{24,}\b/g, replacement: '[REDACTED_STRIPE_KEY]' },
    { pattern: /\bsk_test_[a-zA-Z0-9]{24,}\b/g, replacement: '[REDACTED_STRIPE_KEY]' },

    // Generic Bearer Tokens
    { pattern: /[Bb]earer\s+[a-zA-Z0-9_-]{20,}/g, replacement: 'Bearer [REDACTED_TOKEN]' },

    // SendGrid API Keys
    { pattern: /\bSG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}\b/g, replacement: '[REDACTED_SENDGRID_KEY]' },
  ];

  /**
   * Redact sensitive tokens and passwords from text
   */
  public redact(text: string): string {
    if (!text) return text;
    let sanitized = text;

    for (const rule of this.rules) {
      sanitized = sanitized.replace(rule.pattern, rule.replacement);
    }

    return sanitized;
  }
}
