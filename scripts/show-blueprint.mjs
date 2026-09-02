import { readFile } from 'fs/promises';
try {
  const text = await readFile(new URL('../blueprint.md', import.meta.url), 'utf8');
  console.log(text);
} catch (err) {
  console.error('Unable to read blueprint.md:', err.message);
  process.exit(2);
}
