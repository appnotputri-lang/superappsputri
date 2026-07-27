import { handleOptions, createJsonResponse } from '../../../src/runtime/response';

export const onRequestGet = async (context: any) => {
  const { env } = context;

  const email = env?.FIREBASE_SA_CLIENT_EMAIL || '';
  const key = env?.FIREBASE_SA_PRIVATE_KEY || '';
  const normalizedKey = key.replace(/\\n/g, '\n');

  return createJsonResponse({
    hasEmail: !!email,
    emailPreview: email ? `${email.slice(0, 15)}...${email.slice(-25)}` : null,
    hasKey: !!key,
    keyRawLength: key.length,
    keyNormalizedLength: normalizedKey.length,
    keyStartsWithHeader: normalizedKey.trimStart().startsWith('-----BEGIN PRIVATE KEY-----'),
    keyEndsWithFooter: normalizedKey.trimEnd().endsWith('-----END PRIVATE KEY-----'),
    keyFirst40Chars: normalizedKey.slice(0, 40),
    keyLast40Chars: normalizedKey.slice(-40),
    keyLineCount: normalizedKey.split('\n').length,
    containsLiteralBackslashN: key.includes('\\n'),
    containsRealNewline: key.includes('\n'),
  });
};

export const onRequestOptions = async () => {
  return handleOptions();
};
