import { execFileSync } from 'node:child_process';

const base = process.argv[2] || 'origin/dev';
const forbiddenPaths = [/^ERP\/web\/handoff\.md$/, /^ERP\/web\/\.env/, /^\.env/];
const secretPatterns = [/service[_-]?role/i, /provider token/i, /BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY/];

function git(args) {
    return execFileSync('git', args, { encoding: 'utf8' });
}

const changedPaths = git(['diff', '--name-only', `${base}...HEAD`])
    .split('\n')
    .concat(git(['diff', '--name-only']).split('\n'))
    .concat(git(['diff', '--cached', '--name-only']).split('\n'))
    .map(line => line.trim())
    .filter(Boolean);
const uniqueChangedPaths = [...new Set(changedPaths)];

const forbiddenChanged = uniqueChangedPaths.filter(path => forbiddenPaths.some(pattern => pattern.test(path)));
if (forbiddenChanged.length > 0) {
    console.error(`Forbidden paths changed: ${forbiddenChanged.join(', ')}`);
    process.exit(1);
}

const diff = [
    git(['diff', '--unified=0', `${base}...HEAD`]),
    git(['diff', '--unified=0']),
    git(['diff', '--cached', '--unified=0'])
].join('\n');
const addedLines = diff.split('\n').filter(line => line.startsWith('+') && !line.startsWith('+++'));
const secretHit = addedLines.find(line => secretPatterns.some(pattern => pattern.test(line)));
if (secretHit) {
    console.error('Potential secret-bearing line detected in added diff.');
    process.exit(1);
}

console.log(`OK scope scan checked ${uniqueChangedPaths.length} changed paths against ${base} plus worktree changes.`);
