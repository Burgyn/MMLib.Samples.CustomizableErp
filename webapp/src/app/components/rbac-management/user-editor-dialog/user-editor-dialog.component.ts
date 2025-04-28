import { Component, Inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray, AbstractControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select'; // For Role and Tenant selection
import { MatListModule } from '@angular/material/list'; // For displaying assigned roles
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle'; // For 'own' scope toggle

import { RbacService, ScopeType } from '../../../services/rbac.service';
import { Role } from '../../../models/rbac/role.model';
import { User, Scope, UserRoleAssignment } from '../../../models/rbac/user.model';
import { Tenant } from '../../../models/rbac/tenant.model';
import { Warehouse } from '../../../models/rbac/warehouse.model'; // Import Warehouse
import { NumericRange } from '../../../models/rbac/numeric-range.model'; // Import NumericRange
import { Subject, combineLatest, filter, first, takeUntil, Observable, map, shareReplay, tap, startWith, Subscription, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { RoleEditorDialogComponent } from '../role-editor-dialog/role-editor-dialog.component'; // Import RoleEditorDialog

@Component({
  selector: 'app-user-editor-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatListModule,
    MatIconModule,
    MatDividerModule,
    MatCheckboxModule,
    MatSlideToggleModule // Add MatSlideToggleModule
  ],
  templateUrl: './user-editor-dialog.component.html',
  styleUrl: './user-editor-dialog.component.css'
})
export class UserEditorDialogComponent implements OnInit, OnDestroy {

  userForm: FormGroup;
  isEditMode: boolean;
  allRoles$: Observable<Role[] | undefined>;
  allTenants$: Observable<Tenant[] | undefined>;
  allWarehouses$: Observable<Warehouse[] | undefined>;
  allNumericRanges$: Observable<NumericRange[] | undefined>;
  relevantScopeTypesMap = new Map<number, Observable<ScopeType[]>>();
  private roleChangeSubscriptions: Subscription[] = [];
  private destroy$ = new Subject<void>();

  private localTenants: Tenant[] = [];
  private localRoles: Role[] = [];

  constructor(
    public dialogRef: MatDialogRef<UserEditorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { user: User | null },
    private fb: FormBuilder,
    private rbacService: RbacService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog // Inject MatDialog
  ) {
    this.isEditMode = !!data.user;

    this.userForm = this.fb.group({
      id: [data.user?.id || (this.isEditMode ? '' : null)],
      name: [data.user?.name || '', Validators.required],
      email: [data.user?.email || '', [Validators.required, Validators.email]],
      roleAssignments: this.fb.array([])
    });

    if (this.isEditMode) {
      this.userForm.get('email')?.disable();
    }

    this.allRoles$ = this.rbacService.isInitialized$.pipe(
        filter(init => init === true),
        first(),
        switchMap(() => this.rbacService.getRoles()),
        map(roles => roles.sort((a, b) => a.name.localeCompare(b.name))),
        tap(roles => this.localRoles = roles || []),
        shareReplay(1)
    );

    this.allTenants$ = this.rbacService.isInitialized$.pipe(
        filter(init => init === true),
        first(),
        switchMap(() => this.rbacService.getTenants()),
        tap(tenants => this.localTenants = tenants || []),
        shareReplay(1)
    );

    this.allWarehouses$ = this.rbacService.isInitialized$.pipe(
        filter(init => init === true),
        first(),
        switchMap(() => this.rbacService.getWarehouses()),
        shareReplay(1)
    );

    this.allNumericRanges$ = this.rbacService.isInitialized$.pipe(
        filter(init => init === true),
        first(),
        switchMap(() => this.rbacService.getNumericRanges()),
        shareReplay(1)
    );
  }

  ngOnInit(): void {
    combineLatest([this.allRoles$, this.allTenants$, this.allWarehouses$, this.allNumericRanges$]).pipe(
        first(),
        takeUntil(this.destroy$)
    ).subscribe(() => {
        console.log('Roles, Tenants, Warehouses, and Numeric Ranges observables emitted, populating form...');
        this.populateRoleAssignments();
        this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.roleChangeSubscriptions.forEach(sub => sub.unsubscribe());
    this.destroy$.next();
    this.destroy$.complete();
  }

  get roleAssignmentsFormArray(): FormArray {
    return this.userForm.get('roleAssignments') as FormArray;
  }

  populateRoleAssignments(): void {
    while (this.roleAssignmentsFormArray.length !== 0) {
        this.roleAssignmentsFormArray.removeAt(0);
    }
    this.roleChangeSubscriptions.forEach(sub => sub.unsubscribe());
    this.roleChangeSubscriptions = [];
    this.relevantScopeTypesMap.clear();

    if (this.data.user?.roleAssignments && this.data.user.roleAssignments.length > 0) {
      console.log('Populating role assignments from user data:', this.data.user.roleAssignments);
      this.data.user.roleAssignments.forEach(assignment => {
        this.addRoleAssignment(assignment);
      });
    } else {
         console.log('No existing role assignments or new user. Adding one empty row.');
         this.addRoleAssignment();
    }
     console.log('FormArray after population:', this.roleAssignmentsFormArray.controls);
  }

  addRoleAssignment(initialAssignment?: UserRoleAssignment): void {
    const index = this.roleAssignmentsFormArray.length;
    const newGroup = this.createRoleAssignmentGroup(initialAssignment);
    this.roleAssignmentsFormArray.push(newGroup);
    this.setupRoleChangeListener(newGroup, index);
    if (initialAssignment?.roleId) {
        this.updateRelevantScopes(initialAssignment.roleId, index);
    }
  }

  removeRoleAssignment(index: number): void {
    this.roleAssignmentsFormArray.removeAt(index);
    this.roleChangeSubscriptions[index]?.unsubscribe();
    this.roleChangeSubscriptions.splice(index, 1);
    this.relevantScopeTypesMap.delete(index);
  }

  createRoleAssignmentGroup(assignment?: UserRoleAssignment): FormGroup {
      const tenantScope = assignment?.scopes.find(s => s.type === 'tenant');
      const warehouseScope = assignment?.scopes.find(s => s.type === 'warehouse');
      const numericRangeScope = assignment?.scopes.find(s => s.type === 'numericRange');
      const ownScope = assignment?.scopes.some(s => s.type === 'own');

      let tenantValue = tenantScope?.value === 'all' || Array.isArray(tenantScope?.value) ? 'all' : tenantScope?.value;
      if (tenantValue !== 'all' && !this.localTenants.some(t => t.id === tenantValue)) {
          console.warn(`Tenant ID ${tenantValue} not found in available tenants, defaulting to 'all'.`);
          tenantValue = 'all';
      }

      return this.fb.group({
          roleId: [assignment?.roleId || '', Validators.required],
          scopeTenant: [tenantValue || 'all'],
          scopeWarehouse: [warehouseScope?.value || 'all'],
          scopeNumericRange: [numericRangeScope?.value || 'all'],
          scopeOwn: [ownScope || false]
      });
  }

  setupRoleChangeListener(group: FormGroup, index: number): void {
    const roleControl = group.get('roleId');
    if (roleControl) {
      const sub = roleControl.valueChanges.pipe(
        startWith(roleControl.value),
        takeUntil(this.destroy$)
      ).subscribe(roleId => {
          if (roleId) {
            console.log(`Role changed for row ${index}: ${roleId}. Updating relevant scopes...`);
            this.updateRelevantScopes(roleId, index);
          }
      });
      this.roleChangeSubscriptions[index] = sub;
    }
  }

  updateRelevantScopes(roleId: string, index: number): void {
     const relevantScopes$ = this.rbacService.getRelevantScopeTypes(roleId).pipe(
         tap(types => console.log(`Relevant scopes for role ${roleId} (row ${index}):`, types)),
         shareReplay(1)
      );
      this.relevantScopeTypesMap.set(index, relevantScopes$);
      this.cdr.detectChanges();
  }

  isScopeRelevant(index: number, scopeType: ScopeType): Observable<boolean> {
      const relevantScopes$ = this.relevantScopeTypesMap.get(index);
      if (!relevantScopes$) {
          return of(false);
      }
      return relevantScopes$.pipe(
          map(types => types.includes(scopeType))
      );
  }

  isRoleSystem(roleId: string | null): boolean {
    if (!roleId) return true; // Cannot edit if no role selected
    const role = this.localRoles.find(r => r.id === roleId);
    return role?.isSystemRole ?? true; // Treat as system if not found or property missing
  }

  editAssignedRole(index: number): void {
    const roleId = this.roleAssignmentsFormArray.at(index)?.get('roleId')?.value;
    if (!roleId) {
      console.warn('No role selected to edit at index', index);
      return;
    }

    // Find the role in the local cache
    const roleToEdit = this.localRoles.find(r => r.id === roleId);

    if (!roleToEdit) {
        console.error(`Role with ID ${roleId} not found in local cache.`);
        alert('Chyba: Rola nebola nájdená.');
        return;
    }

    if (roleToEdit.isSystemRole) {
      alert('Systémové role nie je možné upravovať priamo. Môžete vytvoriť kópiu v sekcii Roly.');
      return;
    }

    // Deep copy the role for editing
    const roleCopy = JSON.parse(JSON.stringify(roleToEdit));

    const dialogRef = this.dialog.open(RoleEditorDialogComponent, {
      width: '600px',
      data: { role: roleCopy },
      // Consider adding disableClose: true if needed
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(savedRole => {
      if (savedRole) {
        console.log('Role editor closed, saved data:', savedRole);
        // We need to refresh the list of roles available in the select dropdowns
        // Easiest way is to trigger a re-fetch of the allRoles$ observable.
        // This implementation is simple but might fetch more than needed.
        // A more refined approach could use a subject in RbacService to signal updates.

         // Simple re-trigger: Update local cache and maybe force observable update
         const idx = this.localRoles.findIndex(r => r.id === savedRole.id);
         if (idx > -1) {
             this.localRoles[idx] = savedRole;
         } else {
             this.localRoles.push(savedRole); // Should not happen in edit case
         }
         // Re-sort
         this.localRoles.sort((a, b) => a.name.localeCompare(b.name));
         // Manually trigger change detection for the dialog
         this.cdr.detectChanges();

         // How to make allRoles$ re-emit? We didn't implement a refresh mechanism.
         // For now, the local cache update ensures isRoleSystem works.
         // The select dropdown might not update immediately without a full refresh trigger.
         alert('Rola bola upravená. Zmena sa prejaví v tomto dialógu (napr. pri ďalšom otvorení), alebo obnovte dáta v hlavnom zozname používateľov.');
      }
    });
  }

  prepareSaveData(): User {
    const formValue = this.userForm.getRawValue();
    const user: User = {
      id: formValue.id || formValue.email,
      name: formValue.name,
      email: formValue.email,
      roleAssignments: formValue.roleAssignments
        .filter((assignment: any) => !!assignment.roleId)
        .map((assignment: any) => {
            const scopes: Scope[] = [];
            if (assignment.scopeTenant) {
                scopes.push({ type: 'tenant', value: assignment.scopeTenant });
            }
            if (assignment.scopeWarehouse) {
                scopes.push({ type: 'warehouse', value: assignment.scopeWarehouse });
            }
            if (assignment.scopeNumericRange) {
                scopes.push({ type: 'numericRange', value: assignment.scopeNumericRange });
            }
            if (assignment.scopeOwn === true) {
                scopes.push({ type: 'own', value: 'own' });
            }
            return { roleId: assignment.roleId, scopes: scopes };
        })
    };
    return user;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.userForm.valid) {
        const userData = this.prepareSaveData();
         console.log('Saving User Data:', userData);
        this.dialogRef.close(userData);
    } else {
         console.error('User form is invalid:', this.userForm.errors, this.userForm.value);
         this.userForm.markAllAsTouched();
    }
  }
}
