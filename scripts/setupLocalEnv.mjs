import { constants, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = path.resolve(scriptDirectory, '..');

const localEnvironmentFiles = [
  { template: '.env.example', target: '.env' },
  { template: 'apps/web/.env.example', target: 'apps/web/.env.local' },
];

export function setupLocalEnvironment(repositoryRoot = defaultRepositoryRoot, log = console.log) {
  const results = [];

  for (const entry of localEnvironmentFiles) {
    const templatePath = path.join(repositoryRoot, entry.template);
    const targetPath = path.join(repositoryRoot, entry.target);

    if (!existsSync(templatePath)) {
      throw new Error(`Missing environment template: ${entry.template}`);
    }

    if (existsSync(targetPath)) {
      log(`Preserved existing ${entry.target}`);
      results.push({ ...entry, status: 'preserved' });
      continue;
    }

    try {
      copyFileSync(templatePath, targetPath, constants.COPYFILE_EXCL);
      log(`Created ${entry.target} from ${entry.template}`);
      results.push({ ...entry, status: 'created' });
    } catch (error) {
      if (error && typeof error === 'object' && error.code === 'EEXIST') {
        log(`Preserved existing ${entry.target}`);
        results.push({ ...entry, status: 'preserved' });
        continue;
      }
      throw error;
    }
  }

  log('Local environment setup finished without printing configuration values.');
  return results;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  setupLocalEnvironment();
}
