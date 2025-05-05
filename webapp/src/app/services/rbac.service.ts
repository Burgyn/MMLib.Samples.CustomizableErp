import { BehaviorSubject, Observable, from, of, throwError } from 'rxjs';
import { IndexedDbService, StoreName } from './indexed-db.service';
import { Scope, User, UserRoleAssignment } from '../models/rbac/user.model';
import { catchError, filter, first, map, switchMap, tap } from 'rxjs/operators';

import { Action } from '../models/rbac/action.model';
import { Group } from '../models/rbac/group.model';
import { Injectable } from '@angular/core';
import { NumericRange } from '../models/rbac/numeric-range.model';
import { Role } from '../models/rbac/role.model';
import { Tenant } from '../models/rbac/tenant.model';
import { Warehouse } from '../models/rbac/warehouse.model';

export type ScopeType = 'tenant' | 'warehouse' | 'numericRange' | 'own';

@Injectable({
  providedIn: 'root'
})
export class RbacService {

  private rolesStore: StoreName = 'roles';
  private usersStore: StoreName = 'users';
  private tenantsStore: StoreName = 'tenants';
  private warehousesStore: StoreName = 'warehouses';
  private numericRangesStore: StoreName = 'numericRanges';
  private groupsStore: StoreName = 'groups';

  private isInitialized = new BehaviorSubject<boolean>(false);
  isInitialized$ = this.isInitialized.asObservable();

  private dummyActions: Action[] = [
    { id: 'Kros.Invoicing/documents/invoices/read', description: 'Čítanie faktúr.' },
    { id: 'Kros.Invoicing/documents/invoices/write', description: 'Vytvorenie novej faktúry, zmena existujúcej.' },
    { id: 'Kros.Invoicing/documents/invoices/delete', description: 'Vymazanie faktúr.' },
    { id: 'Kros.Invoicing/documents/invoices/exportToDesktop', description: 'Export faktúr do desktop aplikácie.' },
    { id: 'Kros.Invoicing/documents/priceQuotes/read', description: 'Čítanie cenových ponúk.' },
    { id: 'Kros.Invoicing/documents/priceQuotes/write', description: 'Vytváranie a zmena cenových ponúk.' },
    { id: 'Kros.Invoicing/documents/priceQuotes/delete', description: 'Vymazanie cenových ponúk.' },
    { id: 'Kros.Invoicing/documents/orders/read', description: 'Čítanie objednávok.' },
    { id: 'Kros.Invoicing/documents/orders/write', description: 'Vytváranie a zmena objednávok.' },
    { id: 'Kros.Invoicing/documents/orders/delete', description: 'Vymazanie objednávok.' },
    { id: 'Kros.Invoicing/documents/deliveryNotes/read', description: 'Čítanie dodacích listov.' },
    { id: 'Kros.Invoicing/documents/deliveryNotes/write', description: 'Vytváranie a zmena dodacích listov.' },
    { id: 'Kros.Invoicing/documents/deliveryNotes/delete', description: 'Vymazanie dodacích listov.' },
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

  private initialTenants: Tenant[] = [
    { id: 'tenant_kros', name: 'KROS a.s.' },
    { id: 'tenant_burgyn', name: 'Burgyn s.r.o.' },
    { id: 'tenant_other', name: 'Iná Firma spol. s r.o.' }
  ];

  private initialWarehouses: Warehouse[] = [
    { id: 'wh_central', name: 'Centrálny sklad (KE)' },
    { id: 'wh_branch_ba', name: 'Pobočka Bratislava' },
    { id: 'wh_external', name: 'Externý sklad XY' }
  ];

  private initialNumericRanges: NumericRange[] = [
    { id: 'nr_inv_2024', name: 'Faktúry 2024', prefix: 'FA24' },
    { id: 'nr_inv_2023', name: 'Faktúry 2023', prefix: 'FA23' },
    { id: 'nr_cash', name: 'Pokladňa', prefix: 'PK' }
  ];

  private initialRoles: Role[] = [
    {
      id: 'sys_admin',
      name: 'Administrátor',
      description: 'Plný prístup ku všetkým funkciám a nastaveniam.',
      isSystemRole: true,
      allowedActionIds: this.dummyActions.map(a => a.id)
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

  private initialUsers: User[] = [
    {
      id: 'admin@kros.sk', name: 'Admin Kros', email: 'admin@kros.sk',
      roleAssignments: [
        { roleId: 'sys_admin', scopes: [{ type: 'tenant', value: 'tenant_kros' }] }
      ]
    },
    {
      id: 'uctovnik@kros.sk', name: 'Účtovník Kros', email: 'uctovnik@kros.sk',
      roleAssignments: [
        { roleId: 'sys_accountant', scopes: [{ type: 'tenant', value: 'tenant_kros' }, { type: 'numericRange', value: 'nr_inv_2024' }] }
      ]
    },
    {
      id: 'manager@burgyn.sk', name: 'Manažér Burgyn', email: 'manager@burgyn.sk',
      roleAssignments: [
        { roleId: 'cust_warehouse_manager', scopes: [{ type: 'tenant', value: 'tenant_burgyn' }, { type: 'warehouse', value: 'wh_central' }] },
        { roleId: 'sys_accountant', scopes: [{ type: 'tenant', value: 'tenant_burgyn' }] }
      ]
    },
    {
      id: 'user@other.com', name: 'Bežný User', email: 'user@other.com',
      roleAssignments: [
        // No roles assigned initially
      ]
    }
  ];

  private initialGroups: Group[] = [
    {
        id: 'group_kros_all', name: 'Všetci KROS', description: 'Všetci používatelia z KROS',
        memberUserIds: ['admin@kros.sk', 'uctovnik@kros.sk'],
        memberGroupIds: [],
        roleAssignments: []
    },
    {
        id: 'group_managers', name: 'Manažéri', description: 'Skupina manažérov',
        memberUserIds: ['manager@burgyn.sk'],
        memberGroupIds: [],
        roleAssignments: []
    },
    {
        id: 'group_nested_example', name: 'Príklad vnorenej', description: '',
        memberUserIds: [],
        memberGroupIds: ['group_managers'], // Contains the Managers group
        roleAssignments: []
    }
  ];

  constructor(private indexedDbService: IndexedDbService) {
    this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      await this.ensureInitialData(this.tenantsStore, this.initialTenants);
      await this.ensureInitialData(this.warehousesStore, this.initialWarehouses);
      await this.ensureInitialData(this.numericRangesStore, this.initialNumericRanges);
      await this.ensureInitialData(this.rolesStore, this.initialRoles);
      await this.ensureInitialData(this.usersStore, this.initialUsers);
      await this.ensureInitialData(this.groupsStore, this.initialGroups);

      this.isInitialized.next(true);
      console.log('RBAC Service Initialized (Roles, Users, Tenants, Warehouses, NumericRanges, Groups).');
    } catch (error) {
      console.error('Error initializing RBAC service database:', error);
      this.isInitialized.next(false);
    }
  }

  private async ensureInitialData<T extends { id: string }>(storeName: StoreName, initialData: T[]): Promise<void> {
    const count = await this.indexedDbService.count(storeName);
    if (count === 0) {
      console.log(`Initializing ${storeName} in IndexedDB...`);
      await Promise.all(initialData.map(item =>
        this.indexedDbService.put<T>(storeName, item)
      ));
      console.log(`Initial ${storeName} loaded into IndexedDB.`);
    }
  }

  private waitForInitialization<T>(): Observable<T> {
    return this.isInitialized$.pipe(
      filter(initialized => initialized === true),
      first(),
    ) as Observable<T>;
  }

  getActions(): Observable<Action[]> {
    return of(this.dummyActions);
  }

  getRoles(): Observable<Role[]> {
    return this.waitForInitialization<void>().pipe(
      switchMap(() => from(this.indexedDbService.getAll<Role>(this.rolesStore))),
      catchError(err => {
        console.error('Error fetching roles:', err);
        return of([]);
      })
    );
  }

  getRole(id: string): Observable<Role | undefined> {
    return this.waitForInitialization<void>().pipe(
      switchMap(() => from(this.indexedDbService.getById<Role>(this.rolesStore, id))),
      catchError(err => {
        console.error(`Error fetching role ${id}:`, err);
        return of(undefined);
      })
    );
  }

  saveRole(role: Role): Observable<Role> {
    return this.waitForInitialization<void>().pipe(
      switchMap(() => from(this.indexedDbService.getById<Role>(this.rolesStore, role.id || ''))),
      switchMap(existingRole => {
        let saveOperation: Promise<string>;
        if (existingRole) {
          console.log('Updating existing role:', role);
          saveOperation = this.indexedDbService.put<Role>(this.rolesStore, role);
        } else {
          if (!role.id) {
            role.id = `cust_role_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          }
          role.isSystemRole = false;
          console.log('Adding new role:', role);
          saveOperation = this.indexedDbService.add<Role>(this.rolesStore, role);
        }
        return from(saveOperation).pipe(
          tap(savedId => console.log(`Role ${savedId} saved successfully.`)),
          map(() => role)
        );
      }),
      catchError(err => {
        console.error('Error saving role:', err);
        return throwError(() => new Error('Failed to save role'));
      })
    );
  }

  deleteRole(id: string): Observable<void> {
    return this.waitForInitialization<void>().pipe(
      switchMap(() => this.getRole(id)),
      switchMap(role => {
        if (role && role.isSystemRole) {
          console.error('System roles cannot be deleted.');
          return throwError(() => new Error('Systémové role nie je možné vymazať.'));
        } else if (role) {
          console.log('Deleting role:', id);
          return from(this.indexedDbService.delete(this.rolesStore, id)).pipe(
            tap(() => console.log(`Role ${id} deleted.`))
          );
        } else {
          console.warn(`Role with id ${id} not found for deletion.`);
          return of(void 0);
        }
      }),
      catchError(err => {
        console.error('Error deleting role:', err);
        return throwError(() => err);
      })
    );
  }

  getTenants(): Observable<Tenant[]> {
    return this.waitForInitialization<void>().pipe(
      switchMap(() => from(this.indexedDbService.getAll<Tenant>(this.tenantsStore))),
      catchError(err => {
        console.error('Error fetching tenants:', err);
        return of([]);
      })
    );
  }

  getWarehouses(): Observable<Warehouse[]> {
    return this.waitForInitialization<void>().pipe(
      switchMap(() => from(this.indexedDbService.getAll<Warehouse>(this.warehousesStore))),
      catchError(err => {
        console.error('Error fetching warehouses:', err);
        return of([]);
      })
    );
  }

  getNumericRanges(): Observable<NumericRange[]> {
    return this.waitForInitialization<void>().pipe(
      switchMap(() => from(this.indexedDbService.getAll<NumericRange>(this.numericRangesStore))),
      catchError(err => {
        console.error('Error fetching numeric ranges:', err);
        return of([]);
      })
    );
  }

  getUsers(): Observable<User[]> {
    return this.waitForInitialization<void>().pipe(
      switchMap(() => from(this.indexedDbService.getAll<User>(this.usersStore))),
      catchError(err => {
        console.error('Error fetching users:', err);
        return of([]);
      })
    );
  }

  getUser(id: string): Observable<User | undefined> {
    return this.waitForInitialization<void>().pipe(
      switchMap(() => from(this.indexedDbService.getById<User>(this.usersStore, id))),
      catchError(err => {
        console.error(`Error fetching user ${id}:`, err);
        return of(undefined);
      })
    );
  }

  saveUser(user: User): Observable<User> {
    return this.waitForInitialization<void>().pipe(
      tap(u => { if (!user.id) { user.id = user.email; } }),
      switchMap(() => from(this.indexedDbService.getById<User>(this.usersStore, user.id))),
      switchMap(existingUser => {
        let saveOperation: Promise<string>;
        if (existingUser) {
          console.log('Updating existing user:', user);
          saveOperation = this.indexedDbService.put<User>(this.usersStore, user);
        } else {
          console.log('Adding new user:', user);
          saveOperation = this.indexedDbService.add<User>(this.usersStore, user);
        }
        return from(saveOperation).pipe(
          tap(savedId => console.log(`User ${savedId} saved successfully.`)),
          map(() => user)
        );
      }),
      catchError(err => {
        console.error('Error saving user:', err);
        return throwError(() => new Error('Failed to save user'));
      })
    );
  }

  deleteUser(id: string): Observable<void> {
    return this.waitForInitialization<void>().pipe(
      switchMap(() => from(this.indexedDbService.delete(this.usersStore, id))),
      tap(() => console.log(`User ${id} deleted.`)),
      catchError(err => {
        console.error('Error deleting user:', err);
        return throwError(() => new Error('Failed to delete user'));
      })
    );
  }

  getRelevantScopeTypes(roleId: string): Observable<ScopeType[]> {
    return this.getRole(roleId).pipe(
      map(role => {
        const relevantTypes = new Set<ScopeType>();
        relevantTypes.add('tenant');
        relevantTypes.add('own');

        if (!role || !role.allowedActionIds) {
          return Array.from(relevantTypes);
        }

        for (const actionId of role.allowedActionIds) {
          if (actionId.startsWith('Kros.Warehouse/')) {
            relevantTypes.add('warehouse');
          }
          if (actionId.startsWith('Kros.Invoicing/')) {
            relevantTypes.add('numericRange');
          }
        }
        return Array.from(relevantTypes);
      }),
      catchError(err => {
        console.error(`Error getting relevant scope types for role ${roleId}:`, err);
        const defaultScopes: ScopeType[] = ['tenant', 'own'];
        return of(defaultScopes);
      })
    );
  }

  getGroups(): Observable<Group[]> {
    return this.waitForInitialization<void>().pipe(
      switchMap(() => from(this.indexedDbService.getAll<Group>(this.groupsStore))),
      catchError(err => {
        console.error('Error fetching groups:', err);
        return of([]);
      })
    );
  }

  getGroup(id: string): Observable<Group | undefined> {
    return this.waitForInitialization<void>().pipe(
      switchMap(() => from(this.indexedDbService.getById<Group>(this.groupsStore, id))),
      catchError(err => {
        console.error(`Error fetching group ${id}:`, err);
        return of(undefined);
      })
    );
  }

  saveGroup(group: Group): Observable<Group> {
    return this.waitForInitialization<void>().pipe(
      switchMap(() => from(this.indexedDbService.getById<Group>(this.groupsStore, group.id || ''))),
      switchMap(existingGroup => {
        let saveOperation: Promise<string>;
        if (existingGroup) {
          console.log('Updating existing group:', group);
          saveOperation = this.indexedDbService.put<Group>(this.groupsStore, group);
        } else {
          if (!group.id) {
            group.id = `group_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          }
          console.log('Adding new group:', group);
          saveOperation = this.indexedDbService.add<Group>(this.groupsStore, group);
        }
        return from(saveOperation).pipe(
          tap(savedId => console.log(`Group ${savedId} saved successfully.`)),
          map(() => group)
        );
      }),
      catchError(err => {
        console.error('Error saving group:', err);
        return throwError(() => new Error('Failed to save group'));
      })
    );
  }

  deleteGroup(id: string): Observable<void> {
    return this.waitForInitialization<void>().pipe(
      switchMap(() => from(this.indexedDbService.delete(this.groupsStore, id))),
      tap(() => console.log(`Group ${id} deleted.`)),
      catchError(err => {
        console.error('Error deleting group:', err);
        return throwError(() => new Error('Failed to delete group'));
      })
    );
  }
}
