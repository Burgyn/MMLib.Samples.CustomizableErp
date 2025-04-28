import { DBSchema, IDBPDatabase, openDB } from 'idb';

import { Injectable } from '@angular/core';
import { NumericRange } from '../models/rbac/numeric-range.model'; // Import NumericRange model
import { Role } from '../models/rbac/role.model'; // Import Role
import { Tenant } from '../models/rbac/tenant.model'; // Import Tenant model
import { User } from '../models/rbac/user.model'; // Import User model
import { Warehouse } from '../models/rbac/warehouse.model'; // Import Warehouse model

// Define the database schema
interface RbacDB extends DBSchema {
  roles: {
    key: string; // Role ID
    value: Role; // Use the specific Role model
    indexes: { 'name': string };
  };
  users: { // Add users store
    key: string; // User ID (e.g., email or unique identifier)
    value: User;
    indexes: { 'email': string, 'name': string };
  };
  tenants: { // Add tenants store
      key: string; // Tenant ID
      value: Tenant;
      indexes: { 'name': string };
  };
  warehouses: { key: string; value: Warehouse; indexes: { name: string }; }; // Add warehouses store
  numericRanges: { key: string; value: NumericRange; indexes: { name: string }; }; // Add numericRanges store
  // Add other stores if needed (e.g., groups)
}

// Define StoreName type explicitly for clarity and type safety
export type StoreName = keyof RbacDB;

@Injectable({
  providedIn: 'root'
})
export class IndexedDbService {
  private dbName = 'rbac-db';
  private dbVersion = 3; // Increment version for schema change
  private dbPromise: Promise<IDBPDatabase<RbacDB>>;

  constructor() {
    this.dbPromise = this.openDb();
  }

  private async openDb(): Promise<IDBPDatabase<RbacDB>> {
    return openDB<RbacDB>(this.dbName, this.dbVersion, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log(`Upgrading DB from version ${oldVersion} to ${newVersion}`);
        // Upgrade logic based on oldVersion
        if (oldVersion < 1) {
             if (!db.objectStoreNames.contains('roles')) {
                const store = db.createObjectStore('roles', { keyPath: 'id' });
                store.createIndex('name', 'name');
            }
        }
         if (oldVersion < 2) {
             if (!db.objectStoreNames.contains('users')) {
                const store = db.createObjectStore('users', { keyPath: 'id' });
                store.createIndex('email', 'email', { unique: true });
                store.createIndex('name', 'name');
            }
            if (!db.objectStoreNames.contains('tenants')) {
                const store = db.createObjectStore('tenants', { keyPath: 'id' });
                store.createIndex('name', 'name');
            }
        }
         if (oldVersion < 3) {
            if (!db.objectStoreNames.contains('warehouses')) {
                const store = db.createObjectStore('warehouses', { keyPath: 'id' });
                store.createIndex('name', 'name');
            }
             if (!db.objectStoreNames.contains('numericRanges')) {
                const store = db.createObjectStore('numericRanges', { keyPath: 'id' });
                store.createIndex('name', 'name');
            }
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
