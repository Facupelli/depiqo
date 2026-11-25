import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { baselineName, fingerprint, repository } from '../tools/oxlint/comments.mjs';

const rule = 'depiqo-comments/no-comments';
const diagnosticCode = 'depiqo-comments(no-comments)';

function fixture(t) {
  const cwd = mkdtempSync(join(tmpdir(), 'depiqo-comments-test-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const config = 'oxlint.comments.json';
  const script = 'scripts/comment-baseline.mjs';

  function write(path, content) {
    const target = join(cwd, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }

  for (const path of [config, script, 'tools/oxlint/comments.mjs']) {
    const target = join(cwd, path);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(join(repository, path), target);
  }
  symlinkSync(join(repository, 'node_modules'), join(cwd, 'node_modules'), 'junction');
  write('.gitignore', 'node_modules/\n');
  mkdirSync(join(cwd, 'apps'));
  mkdirSync(join(cwd, 'packages'));

  const lint = () => {
    const result = spawnSync(join(repository, 'node_modules/.bin/oxlint'), [
      '--config', config, '--disable-nested-config', 'apps', 'packages', '--format=json',
    ], { cwd, encoding: 'utf8' });
    assert.ok([0, 1].includes(result.status), result.stderr || result.stdout);
    const diagnostics = JSON.parse(result.stdout).diagnostics;
    assert.ok(diagnostics.every(({ code }) => code === diagnosticCode), result.stdout);
    return { status: result.status, diagnostics };
  };
  const manifest = (contents) => write(baselineName, JSON.stringify(contents, null, 2));
  manifest({});
  return {
    write,
    lint,
    manifest,
    readManifest: () => JSON.parse(readFileSync(join(cwd, baselineName), 'utf8')),
    except(path, text) {
      const existing = JSON.parse(readFileSync(join(cwd, config), 'utf8'));
      existing.overrides[0].rules[rule] = ['error', { functionalExceptions: { [path]: [text] } }];
      write(config, JSON.stringify(existing));
    },
    baseline: (...args) => spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8' }),
    git: (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }),
  };
}

test('Oxlint finds TS and TSX comments without scanning literals or generated sources', (t) => {
  const repo = fixture(t);
  const path = 'apps/backoffice/src/sample.tsx';
  repo.write(path, [
    '#!/usr/bin/env node',
    '/** docs */',
    String.raw`const regex = /\/\//; // suffix`,
    'const text = "https://example.test/* text */";',
    'const jsx = <div>/* plain JSX text */{/* JSX comment */}</div>;',
    '// final',
  ].join('\n'));
  repo.write('apps/backoffice/src/routeTree.gen.ts', '// generated\n');
  repo.write('apps/backend/tools/oxlint/anti-slop/example.ts', '// vendored\n');
  repo.write('apps/backend/.oxlintrc.json', JSON.stringify({ ignorePatterns: ['src/**'] }));
  repo.write('apps/backend/src/scripts/example.ts', '/* eslint-disable */\n');
  repo.write('packages/temporal/example.js', '// not TypeScript\n');
  const { status, diagnostics } = repo.lint();
  assert.equal(status, 1);
  assert.deepEqual(diagnostics.filter(({ filename }) => filename === path)
    .map(({ labels }) => labels[0].span.line).sort(), [2, 3, 5, 6]);
  assert.deepEqual(diagnostics.filter(({ filename }) => filename !== path)
    .map(({ filename }) => filename), ['apps/backend/src/scripts/example.ts']);
});

test('supports exact grandfathered comments and reviewed functional exceptions', (t) => {
  const repo = fixture(t);
  const path = 'packages/example/sample.ts';
  const legacy = '// existing comment';
  const directive = '// @vitest-environment jsdom';
  const safety = '// SAFETY: checked invariant';
  repo.manifest({ [path]: [fingerprint(legacy), fingerprint(directive)] });
  repo.except(path, safety);
  repo.write(path, `${directive}\n\n${legacy}\n\n${safety}\nexport const n = 1;\n`);
  assert.deepEqual(repo.lint(), { status: 0, diagnostics: [] });
  const inventory = repo.baseline('inventory');
  assert.equal(inventory.status, 0, inventory.stderr);
  assert.deepEqual(JSON.parse(inventory.stdout).map(({ text, excepted }) => [text, excepted]), [
    [directive, false], [legacy, false], [safety, true],
  ]);
  assert.equal(repo.baseline('prune').status, 0);
  assert.deepEqual(repo.readManifest()[path], [fingerprint(legacy), fingerprint(directive)].sort());
  repo.write(path, `${directive}\n${legacy}\n${legacy}\n${safety}\n${safety}\nexport const n = 1;\n`);
  assert.equal(repo.lint().diagnostics.length, 2);
  repo.write('packages/example/other.ts', `${legacy}\n${safety}\n`);
  assert.equal(repo.lint().diagnostics.length, 4);
});

test('baseline management prunes from Oxlint output and rejects new entries', (t) => {
  const repo = fixture(t);
  const path = 'apps/example/sample.ts';
  const legacy = '// legacy';
  repo.write(path, `${legacy}\nexport const n = 1;\n`);
  repo.manifest({ [path]: [fingerprint(legacy)] });
  repo.git('init', '-q');
  repo.git('add', path, baselineName);
  repo.git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'Initial baseline');

  repo.write(path, 'export const n = 1;\n');
  assert.match(repo.baseline('check', 'HEAD').stderr, /contains deleted comments/);
  assert.equal(repo.baseline('prune').status, 0);
  assert.deepEqual(repo.readManifest(), {});
  assert.equal(repo.baseline('check', 'HEAD').status, 0);

  const replacement = '// replacement';
  repo.write(path, `${replacement}\nexport const n = 1;\n`);
  assert.match(repo.baseline('prune').stderr, /not eligible/);
  assert.deepEqual(repo.readManifest(), {});
  repo.manifest({ [path]: [fingerprint(replacement)] });
  assert.match(repo.baseline('check', 'HEAD').stderr, /cannot gain entries/);
});
