import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repository = fileURLToPath(new URL('../../', import.meta.url));
export const baselineName = '.comment-baseline.json';
export const baselineFile = new URL(`../../${baselineName}`, import.meta.url);
export const inventoryEnv = 'DEPIQO_COMMENT_INVENTORY';

export function readBaseline() {
  return JSON.parse(readFileSync(baselineFile, 'utf8'));
}

export function fingerprint(text) {
  return createHash('sha256').update(text.replaceAll('\r\n', '\n')).digest('hex');
}

export function budget(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return (value) => {
    const remaining = counts.get(value) ?? 0;
    if (remaining === 0) return false;
    counts.set(value, remaining - 1);
    return true;
  };
}

let baseline;

export default {
  meta: { name: 'depiqo-comments' },
  rules: {
    'no-comments': {
      meta: {
        type: 'suggestion',
        messages: { unexpected: 'New source comment. Remove it or document the decision outside the code.' },
        schema: [{
          type: 'object',
          properties: {
            functionalExceptions: { type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } } },
          },
          additionalProperties: false,
        }],
      },
      create(context) {
        const source = context.sourceCode;
        const path = relative(repository, context.physicalFilename).split(sep).join('/');
        const inventory = process.env[inventoryEnv] === '1';
        const takeExisting = budget(inventory ? [] : ((baseline ??= readBaseline())[path] ?? []));
        const takeException = budget(context.options[0]?.functionalExceptions?.[path] ?? []);

        return {
          Program() {
            for (const comment of source.getAllComments()) {
              if (comment.type === 'Shebang') continue;
              const text = source.text.slice(...comment.range).replaceAll('\r\n', '\n');
              const excepted = takeException(text);
              if (inventory) {
                context.report({ loc: comment.loc, message: JSON.stringify({ text, excepted }) });
              } else if (!excepted && !takeExisting(fingerprint(text))) {
                context.report({ loc: comment.loc, messageId: 'unexpected' });
              }
            }
          },
        };
      },
    },
  },
};
