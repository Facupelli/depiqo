import { execFileSync, spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { baselineFile, baselineName, budget, fingerprint, inventoryEnv, readBaseline, repository } from '../tools/oxlint/comments.mjs';

function inventory() {
  const cli = fileURLToPath(new URL('bin/oxlint', import.meta.resolve('oxlint/package.json')));
  const result = spawnSync(process.execPath, [
    cli, '--config', 'oxlint.comments.json', '--disable-nested-config', 'apps', 'packages', '--format=json',
  ], {
    cwd: repository,
    encoding: 'utf8',
    env: { ...process.env, [inventoryEnv]: '1' },
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (![0, 1].includes(result.status) || !result.stdout.trim()) {
    throw new Error(`Oxlint did not return a comment inventory.\n${result.stderr || result.stdout}`);
  }
  const report = JSON.parse(result.stdout);
  if (!report.number_of_files || !Array.isArray(report.diagnostics)) {
    throw new Error('Oxlint did not lint any files or returned an invalid report.');
  }
  return report.diagnostics.map(({ code, message, filename, labels }) => {
    if (code !== 'depiqo-comments(no-comments)') throw new Error(`Oxlint: ${filename}: ${message}`);
    const { line, column } = labels[0].span;
    return { path: filename.replaceAll('\\', '/'), line, column, ...JSON.parse(message) };
  }).sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line || a.column - b.column);
}

function fromInventory(comments) {
  const files = new Map();
  for (const { path, text, excepted } of comments) {
    if (excepted) continue;
    const hashes = files.get(path) ?? [];
    hashes.push(fingerprint(text));
    files.set(path, hashes);
  }
  return Object.fromEntries([...files.keys()].sort().map((path) => [path, files.get(path).sort()]));
}

function additions(current, previous) {
  return Object.entries(current).filter(([path, hashes]) => {
    const take = budget(previous[path] ?? []);
    return hashes.some((hash) => !take(hash));
  }).map(([path]) => path);
}

function git(...args) {
  return execFileSync('git', args, { cwd: repository, encoding: 'utf8' }).trim();
}

function checkBase(baseline, base) {
  if (/^0{40,64}$/.test(base)) return;
  const sha = git('rev-parse', '--verify', '--end-of-options', `${base}^{commit}`);
  if (!git('ls-tree', sha, '--', baselineName)) return;
  const previous = JSON.parse(git('show', `${sha}:${baselineName}`));
  const expanded = additions(baseline, previous);
  if (expanded.length) throw new Error(`The comment baseline cannot gain entries:\n${expanded.join('\n')}`);
}

function main([command, base, ...rest]) {
  if (!['inventory', 'prune', 'check'].includes(command) || (command === 'check') !== Boolean(base) || rest.length) {
    throw new Error('Usage: pnpm lint:comments:baseline <inventory | prune | check <git-ref>>');
  }
  const comments = inventory();
  if (command === 'inventory') {
    console.log(JSON.stringify(comments, null, 2));
    return;
  }

  const baseline = readBaseline();
  const current = fromInventory(comments);
  if (additions(current, baseline).length) {
    throw new Error('New comments are not eligible for the baseline. Run pnpm lint:comments for diagnostics.');
  }
  if (command === 'prune') {
    writeFileSync(baselineFile, `${JSON.stringify(current, null, 2)}\n`);
    return;
  }
  checkBase(baseline, base);
  if (additions(baseline, current).length) {
    throw new Error('The comment baseline contains deleted comments. Run pnpm lint:comments:baseline prune.');
  }
}

try {
  main(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
