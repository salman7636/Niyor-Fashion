import { getStore } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const localOrderDirectory = join(process.cwd(), '.netlify', 'local-blobs', 'niyor-orders');

function useLocalOrderStore() {
  return process.env.NETLIFY_LOCAL === 'true' || process.env.CONTEXT === 'dev';
}

function getLocalOrderPath(key) {
  if (typeof key !== 'string' || !/^[A-Za-z0-9_-]+$/.test(key)) {
    throw new Error('Order storage key is invalid.');
  }
  return join(localOrderDirectory, `${key}.json`);
}

async function readLocalOrder(key) {
  try {
    return JSON.parse(await readFile(getLocalOrderPath(key), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

export async function saveOrder(order, key = order.reference) {
  if (useLocalOrderStore()) {
    await mkdir(localOrderDirectory, { recursive: true });
    const orderPath = getLocalOrderPath(key);
    const temporaryPath = `${orderPath}.${randomUUID()}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(order), 'utf8');
    await rename(temporaryPath, orderPath);
    return;
  }
  await getStore('niyor-orders').setJSON(key, order);
}

export async function getOrder(reference) {
  if (useLocalOrderStore()) return readLocalOrder(reference);
  return getStore('niyor-orders').get(reference, { type: 'json' });
}

export async function listOrders() {
  if (useLocalOrderStore()) {
    let entries;
    try {
      entries = await readdir(localOrderDirectory);
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
    const orders = await Promise.all(entries
      .filter(entry => entry.endsWith('.json'))
      .map(entry => readLocalOrder(entry.slice(0, -5))));
    return orders
      .filter(order => order && typeof order.createdAt === 'string')
      .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  }
  const store = getStore('niyor-orders');
  const { blobs } = await store.list();
  const orders = await Promise.all(blobs.map(blob => store.get(blob.key, { type: 'json' })));
  return orders
    .filter(order => order && typeof order.createdAt === 'string')
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}
