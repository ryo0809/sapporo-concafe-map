import { expect, test } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { getPlatformProxy } from 'wrangler';
import { readPublicCafes } from '../../worker/public-cafes.mjs';

test('native public cafe query works with the migrated D1 schema', async () => {
  const persistPath = path.resolve('.wrangler/tests', `public-cafes-${Date.now()}`);
  const setup = spawnSync(process.execPath, ['scripts/d1-setup.mjs', '--local', '--from-json'], {
    env: { ...process.env, D1_PERSIST_PATH: persistPath }, encoding: 'utf8',
  });
  expect(setup.status, setup.stderr).toBe(0);

  const proxy = await getPlatformProxy({ persist: { path: path.join(persistPath, 'v3') } });
  try {
    const db = proxy.env.DB;
    const fixture = await db.prepare('SELECT id, name FROM cafes LIMIT 1').first();
    expect(fixture).toBeTruthy();
    expect(await readPublicCafes(db)).toEqual([]);
    await db.prepare("UPDATE cafes SET publication_status='published', version=version+1 WHERE deleted_at IS NULL").run();
    const cafes = await readPublicCafes(db);
    expect(cafes.some(cafe => cafe.id === fixture.id && cafe.name === fixture.name)).toBe(true);
    expect(cafes.every(cafe => typeof cafe.floor === 'string')).toBe(true);
  } finally {
    await proxy.dispose();
  }
});
