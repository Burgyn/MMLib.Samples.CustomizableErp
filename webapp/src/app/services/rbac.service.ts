import { BehaviorSubject, Observable, from, of, throwError } from 'rxjs';
import { IndexedDbService, StoreName } from './indexed-db.service';
import { catchError, filter, first, map, switchMap, tap } from 'rxjs/operators';

import { Action } from '../models/rbac/action.model';
import { Injectable } from '@angular/core';
import { Role } from '../models/rbac/role.model';

@Injectable({
  providedIn: 'root'
})
export class RbacService {

  private rolesStore: StoreName = 'roles';
  private isInitialized = new BehaviorSubject<boolean>(false);
  isInitialized$ = this.isInitialized.asObservable();

  private dummyActions: Action[] = [
    { id: 'Kros.Invoicing/documents/invoices/read', description: 'Čítanie faktúr.' },
    { id: 'Kros.Invoicing/documents/invoices/write', description: 'Vytvorenie novej faktúry, zmena existujúcej.' },
    { id: 'Kros.Invoicing/documents/invoices/delete', description: 'Vymazanie faktúr.' },
    { id: 'Kros.Invoicing/documents/invoices/exportToDesktop', description: 'Export faktúr do desktop aplikácie.' },
    { id: 'Kros.Invoicing/documentTemplates/invoices/read', description: 'Čítanie šablón faktúr.' },
    { id: 'Kros.Invoicing/documentTemplates/invoices/write', description: 'Vytváranie a zmena šablón faktúr.' },
    { id: 'Kros.Invoicing/documentTemplates/invoices/delete', description: 'Vymazanie šablón faktúr.' },
    { id: 'Kros.Warehouse/warehouses/read', description: 'Čítanie skladov.' },
    { id: 'Kros.Warehouse/warehouses/write', description: 'Vytvorenie nových skladov, zmena existujúcich.' },
    { id: 'Kros.Warehouse/warehouses/delete', description: 'Vymazanie skladov.' },
    { id: 'Kros.Warehouse/warehouses/stockItems/read', description: 'Čítanie skladových položiek.' },
    { id: 'Kros.Warehouse/warehouses/stockItems/write', description: 'Vytváranie nových, zmena existujúcich skladových položiek.' },
    { id: 'Kros.Warehouse/warehouses/stockItems/delete', description: 'Vymazávanie skladových položiek.' },
    { id: 'Kros.Warehouse/warehouses/stockItems/export', description: 'Export skladových položiek.' },
    { id: 'Kros.Warehouse/warehouses/stockItems/import', description: 'Import skladových položiek.' },
    { id: 'Kros.Warehouse/warehouses/nonStockItems/write', description: 'Vytvorenie a zmena neskladových položiek.' },
    { id: 'Kros.Warehouse/warehouses/nonStockItems/delete', description: 'Zmazanie neskladových položiek.' },
    { id: 'Kros.Warehouse/warehouses/stockMovements/read', description: 'Čítanie skladových pohybov.' },
    { id: 'Kros.Warehouse/warehouses/stockMovements/write', description: 'Vytváranie a zmena skladových pohybov.' },
    { id: 'Kros.Warehouse/warehouses/stockMovements/delete', description: 'Vymazávanie skladových pohybov.' },
  ];

  private initialRoles: Role[] = [
    {
      id: 'sys_admin',
      name: 'Administrátor',
      description: 'Plný prístup ku všetkým funkciám a nastaveniam.',
      isSystemRole: true,
      allowedActionIds: this.dummyActions.map(a => a.id) // Admin has all permissions
    },
    {
      id: 'sys_accountant',
      name: 'Účtovník',
      description: 'Prístup k fakturácii a skladovým dokladom.',
      isSystemRole: true,
      allowedActionIds: [
        'Kros.Invoicing/documents/invoices/read',
        'Kros.Invoicing/documents/invoices/write',
        'Kros.Invoicing/documents/invoices/exportToDesktop',
        'Kros.Warehouse/warehouses/stockItems/read',
        'Kros.Warehouse/warehouses/stockMovements/read',
        'Kros.Warehouse/warehouses/stockMovements/write'
      ]
    },
    {
      id: 'cust_warehouse_manager',
      name: 'Vedúci skladu (počiatočná)',
      description: 'Správa skladov a skladových položiek.',
      isSystemRole: false,
      allowedActionIds: [
        'Kros.Warehouse/warehouses/read',
        'Kros.Warehouse/warehouses/write',
        'Kros.Warehouse/warehouses/stockItems/read',
        'Kros.Warehouse/warehouses/stockItems/write',
        'Kros.Warehouse/warehouses/stockItems/delete',
        'Kros.Warehouse/warehouses/stockItems/export',
        'Kros.Warehouse/warehouses/stockItems/import',
        'Kros.Warehouse/warehouses/nonStockItems/write',
        'Kros.Warehouse/warehouses/nonStockItems/delete',
        'Kros.Warehouse/warehouses/stockMovements/read',
        'Kros.Warehouse/warehouses/stockMovements/write',
        'Kros.Warehouse/warehouses/stockMovements/delete'
      ]
    }
  ];

  constructor(private indexedDbService: IndexedDbService) {
    // Start initialization immediately
    this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      await this.ensureInitialRoles();
      this.isInitialized.next(true);
      console.log('RBAC Service Initialized.');
    } catch (error) {
      console.error('Error initializing RBAC service database:', error);
      this.isInitialized.next(false); // Indicate initialization failed
      // Optionally, propagate the error or handle it further
    }
  }

  private async ensureInitialRoles(): Promise<void> {
    const count = await this.indexedDbService.count(this.rolesStore);
    if (count === 0) {
      console.log('Initializing roles in IndexedDB...');
      // Use Promise.all to run puts in parallel for faster initialization
      await Promise.all(this.initialRoles.map(role =>
        this.indexedDbService.put(this.rolesStore, role)
      ));
      console.log('Initial roles loaded into IndexedDB.');
    }
  }

  // Helper function to wait for initialization
  private waitForInitialization<T>(): Observable<T> {
    return this.isInitialized$.pipe(
      filter(initialized => initialized === true),
      first(), // Take the first true value and complete
    ) as Observable<T>; // Cast needed because filter/first don't change the generic type directly
  }

  getActions(): Observable<Action[]> {
    // Actions are static, no need to wait for DB init
    return of(this.dummyActions);
  }

  getRoles(): Observable<Role[]> {
    return this.waitForInitialization<void>().pipe(
      switchMap(() => from(this.indexedDbService.getAll<Role>(this.rolesStore))),
      catchError(err => {
        console.error('Error fetching roles:', err);
        return of([]); // Return empty array on error
      })
    );
  }

  getRole(id: string): Observable<Role | undefined> {
    return this.waitForInitialization<void>().pipe(
      switchMap(() => from(this.indexedDbService.getById<Role>(this.rolesStore, id))),
      catchError(err => {
        console.error(`Error fetching role ${id}:`, err);
        return of(undefined); // Return undefined on error
      })
    );
  }

  saveRole(role: Role): Observable<Role> {
    return this.waitForInitialization<void>().pipe(
      switchMap(() => from(this.indexedDbService.getById<Role>(this.rolesStore, role.id || ''))), // Check if exists
      switchMap(existingRole => {
        let saveOperation: Promise<string>;
        if (existingRole) {
          console.log('Updating existing role:', role);
          // Update existing role
          saveOperation = this.indexedDbService.put<Role>(this.rolesStore, role);
        } else {
          // Add new role - generate ID if missing
          if (!role.id) {
            role.id = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          }
          role.isSystemRole = false; // Ensure new roles are never system roles
          console.log('Adding new role:', role);
          saveOperation = this.indexedDbService.add<Role>(this.rolesStore, role);
        }
        return from(saveOperation).pipe(
          tap(savedId => console.log(`Role ${savedId} saved successfully.`)),
          map(() => role) // Return the role object after save
        );
      }),
      catchError(err => {
        console.error('Error saving role:', err);
        return throwError(() => new Error('Failed to save role')); // Propagate error
      })
    );
  }

  deleteRole(id: string): Observable<void> {
    return this.waitForInitialization<void>().pipe(
      switchMap(() => this.getRole(id)), // Use getRole which already handles initialization wait & fetch
      switchMap(role => {
        if (role && role.isSystemRole) {
          console.error('System roles cannot be deleted.');
          return throwError(() => new Error('Systémové role nie je možné vymazať.'));
        } else if (role) {
          console.log('Deleting role:', id);
          // Delete from IndexedDB
          return from(this.indexedDbService.delete(this.rolesStore, id)).pipe(
            tap(() => console.log(`Role ${id} deleted.`))
          );
        } else {
          console.warn(`Role with id ${id} not found for deletion.`);
          // Role not found, nothing to delete, return completed observable
          return of(void 0);
        }
      }),
      catchError(err => {
        // Catch errors from getRole or delete operation
        console.error('Error deleting role:', err);
        // Rethrow or return a user-friendly error
        return throwError(() => err);
      })
    );
  }

}
