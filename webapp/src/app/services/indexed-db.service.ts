import { DBSchema, IDBPDatabase, openDB } from 'idb';

import { Injectable } from '@angular/core';
import { Role } from '../models/rbac/role.model'; // Import Role

// Define the database schema
interface RbacDB extends DBSchema {
  roles: {
    key: string; // Role ID
    value: Role; // Use the specific Role model
    indexes: { 'name': string };
  };
  // Add other stores if needed (e.g., users, groups)
}

// Define StoreName type explicitly for clarity and type safety
export type StoreName = keyof RbacDB;

@Injectable({
  providedIn: 'root'
})
export class IndexedDbService {
  private dbName = 'rbac-db';
  private dbVersion = 1;
  private dbPromise: Promise<IDBPDatabase<RbacDB>>;

  constructor() {
    this.dbPromise = this.openDb();
  }

  private async openDb(): Promise<IDBPDatabase<RbacDB>> {
    return openDB<RbacDB>(this.dbName, this.dbVersion, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('roles')) {
          const store = db.createObjectStore('roles', { keyPath: 'id' });
          store.createIndex('name', 'name');
        }
        // Add upgrades for future versions here
      },
    });
  }

  // Generic CRUD methods using the specific StoreName type

  async getAll<T>(storeName: StoreName): Promise<T[]> {
    const db = await this.dbPromise;
    // Cast storeName to any is needed here because idb expects a specific string literal
    return db.getAll(storeName as any);
  }

  async getById<T>(storeName: StoreName, key: string): Promise<T | undefined> {
    const db = await this.dbPromise;
    return db.get(storeName as any, key);
  }

  async add<T>(storeName: StoreName, value: T): Promise<string> {
    const db = await this.dbPromise;
    const result = await db.add(storeName as any, value);
    return result as string; // Cast the result to string
  }

  async put<T>(storeName: StoreName, value: T): Promise<string> {
    const db = await this.dbPromise;
    const result = await db.put(storeName as any, value);
    return result as string; // Cast the result to string
  }

  async delete(storeName: StoreName, key: string): Promise<void> {
    const db = await this.dbPromise;
    return db.delete(storeName as any, key);
  }

  async count(storeName: StoreName): Promise<number> {
    const db = await this.dbPromise;
    return db.count(storeName as any);
  }
}
