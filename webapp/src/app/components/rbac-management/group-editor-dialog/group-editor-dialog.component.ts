import { Component, Inject, OnInit, OnDestroy, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl, FormArray } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule, MatSelect } from '@angular/material/select';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { MatExpansionModule } from '@angular/material/expansion';

import { RbacService } from '../../../services/rbac.service';
import { Group } from '../../../models/rbac/group.model';
import { User } from '../../../models/rbac/user.model';
import { Role } from '../../../models/rbac/role.model';
import { Tenant } from '../../../models/rbac/tenant.model';
import { Warehouse } from '../../../models/rbac/warehouse.model';
import { NumericRange } from '../../../models/rbac/numeric-range.model';
import { Subject, Observable, combineLatest, map, startWith, takeUntil, switchMap, ReplaySubject, of, tap, shareReplay, Subscription } from 'rxjs';
import { filter, first, debounceTime, distinctUntilChanged } from 'rxjs/operators';

// Interface for combined member list items
interface MemberSelectItem {
    id: string;
    name: string;
    type: 'user' | 'group';
    email?: string; // For displaying user email
}

@Component({
  selector: 'app-group-editor-dialog',
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
    NgxMatSelectSearchModule,
    MatExpansionModule
  ],
  templateUrl: './group-editor-dialog.component.html',
  styleUrl: './group-editor-dialog.component.css'
})
export class GroupEditorDialogComponent implements OnInit, AfterViewInit, OnDestroy {

  groupForm: FormGroup;
  isEditMode: boolean;
  allRoles$: Observable<Role[] | undefined>;
  allTenants$: Observable<Tenant[] | undefined>;
  allWarehouses$: Observable<Warehouse[] | undefined>;
  allNumericRanges$: Observable<NumericRange[] | undefined>;
  relevantScopeTypesMap = new Map<number, Observable<any>>();
  private roleChangeSubscriptions: Subscription[] = [];
  private localTenants: Tenant[] = [];
  private localRoles: Role[] = [];

  /** Control for the MatSelect filter keyword */
  public memberFilterCtrl: FormControl<string | null> = new FormControl<string>('');

  /** List of members filtered by search */
  public filteredMembers: ReplaySubject<MemberSelectItem[]> = new ReplaySubject<MemberSelectItem[]>(1);

  @ViewChild('memberSelect', { static: true }) memberSelect!: MatSelect;

  /** List of all possible members (users + groups) */
  private allMembers: MemberSelectItem[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    public dialogRef: MatDialogRef<GroupEditorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { group: Group | null },
    private fb: FormBuilder,
    private rbacService: RbacService,
    private cdr: ChangeDetectorRef
  ) {
    this.isEditMode = !!data.group;

    // Combine initial selected IDs for the single multi-select control
    const initialMemberIds = [
      ...(data.group?.memberUserIds || []),
      ...(data.group?.memberGroupIds || [])
    ];

    this.groupForm = this.fb.group({
      id: [data.group?.id || null],
      name: [data.group?.name || '', Validators.required],
      description: [data.group?.description || ''],
      memberIds: [initialMemberIds], // Single control for combined members
      roleAssignments: this.fb.array([])
    });

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
      // Load the combined list of users and groups
      this.loadAllMembers();
      combineLatest([this.allRoles$, this.allTenants$, this.allWarehouses$, this.allNumericRanges$]).pipe(
         first(),
         takeUntil(this.destroy$)
     ).subscribe(() => {
         this.populateRoleAssignments();
         this.cdr.detectChanges();
     });

      // listen for search field value changes
      this.memberFilterCtrl.valueChanges
          .pipe(
              debounceTime(200),
              distinctUntilChanged(),
              takeUntil(this.destroy$)
          )
          .subscribe(() => {
              this.filterMembers();
          });
  }

  ngAfterViewInit() {
    // Set initial selection
    this.setInitialValue();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Getter for selected members count
  get selectedMembersCount(): number {
      const members = this.groupForm.get('memberIds')?.value;
      return Array.isArray(members) ? members.length : 0;
  }

  private loadAllMembers(): void {
     this.rbacService.isInitialized$.pipe(
        filter(init => init), first(),
        switchMap(() => combineLatest([
            this.rbacService.getUsers(),
            this.rbacService.getGroups()
        ])),
        takeUntil(this.destroy$)
     ).subscribe(([users, allGroups]) => {
         // Map users
         const userMembers: MemberSelectItem[] = users.map(u => ({ id: u.id, name: u.name, type: 'user', email: u.email }));
         // Map groups (excluding self)
         const groupMembers: MemberSelectItem[] = allGroups
            .filter(g => g.id !== this.data.group?.id)
            .map(g => ({ id: g.id, name: g.name, type: 'group' }));

         // Combine and sort
         this.allMembers = [...userMembers, ...groupMembers].sort((a, b) => a.name.localeCompare(b.name));
         console.log('Combined members list:', this.allMembers);

         // Load the initial filtered list
         this.filteredMembers.next(this.allMembers.slice());
         this.cdr.detectChanges(); // Ensure view updates after list is loaded
     });
  }

  /**
   * Sets the initial value after the filteredMembers are loaded initially
   */
  private setInitialValue() {
    this.filteredMembers
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Set the initial selected value
        // Using a timeout allows the select component to render the options before setting the value
        // setTimeout(() => {
             // No need to manually set value if using formControlName
        // });
      });
  }

  private filterMembers() {
    if (!this.allMembers) {
      return;
    }
    // get the search keyword
    let search = this.memberFilterCtrl.value?.toLowerCase() || '';

    // filter the members
    this.filteredMembers.next(
      this.allMembers.filter(member =>
          member.name.toLowerCase().includes(search) ||
          (member.type === 'user' && member.email?.toLowerCase().includes(search))
      )
    );
     console.log(`Filtered members for "${search}":`, this.filteredMembers);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  get roleAssignmentsFormArray(): FormArray {
    return this.groupForm.get('roleAssignments') as FormArray;
  }

  populateRoleAssignments(): void {
    while (this.roleAssignmentsFormArray.length !== 0) {
        this.roleAssignmentsFormArray.removeAt(0);
    }
    this.roleChangeSubscriptions.forEach(sub => sub.unsubscribe());
    this.roleChangeSubscriptions = [];
    this.relevantScopeTypesMap.clear();

    if (this.data.group?.roleAssignments && this.data.group.roleAssignments.length > 0) {
      this.data.group.roleAssignments.forEach(assignment => {
        this.addRoleAssignment(assignment);
      });
    } else {
         this.addRoleAssignment();
    }
  }

  addRoleAssignment(initialAssignment?: any): void {
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

  createRoleAssignmentGroup(assignment?: any): FormGroup {
      const tenantScope = assignment?.scopes?.find((s: any) => s.type === 'tenant');
      const warehouseScope = assignment?.scopes?.find((s: any) => s.type === 'warehouse');
      const numericRangeScope = assignment?.scopes?.find((s: any) => s.type === 'numericRange');
      const ownScope = assignment?.scopes?.some((s: any) => s.type === 'own');

      let tenantValue = tenantScope?.value === 'all' || Array.isArray(tenantScope?.value) ? 'all' : tenantScope?.value;
      if (tenantValue !== 'all' && !this.localTenants.some(t => t.id === tenantValue)) {
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
            this.updateRelevantScopes(roleId, index);
          }
      });
      this.roleChangeSubscriptions[index] = sub;
    }
  }

  updateRelevantScopes(roleId: string, index: number): void {
     const relevantScopes$ = this.rbacService.getRelevantScopeTypes(roleId).pipe(
         shareReplay(1)
      );
      this.relevantScopeTypesMap.set(index, relevantScopes$);
      this.cdr.detectChanges();
  }

  isScopeRelevant(index: number, scopeType: string): Observable<boolean> {
      const relevantScopes$ = this.relevantScopeTypesMap.get(index);
      if (!relevantScopes$) {
          return of(false);
      }
      return relevantScopes$.pipe(
          map((types: string[]) => types.includes(scopeType))
      );
  }

  prepareSaveData(): Group {
      const formValue = this.groupForm.value;
      const selectedMemberIds = new Set(formValue.memberIds || []);
      const memberUserIds: string[] = [];
      const memberGroupIds: string[] = [];

      // Classify selected IDs back into users and groups
      this.allMembers.forEach(member => {
          if (selectedMemberIds.has(member.id)) {
              if (member.type === 'user') {
                  memberUserIds.push(member.id);
              } else if (member.type === 'group') {
                  memberGroupIds.push(member.id);
              }
          }
      });

      const roleAssignments = (formValue.roleAssignments || [])
         .filter((assignment: any) => !!assignment.roleId)
         .map((assignment: any) => {
             const scopes: any[] = [];
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
         });

      const groupData: Group = {
        id: formValue.id,
        name: formValue.name,
        description: formValue.description,
        memberUserIds: memberUserIds,
        memberGroupIds: memberGroupIds,
        roleAssignments: roleAssignments
      };

      if (!this.isEditMode) {
           groupData.id = null as any;
       }
       return groupData;
  }

  onSave(): void {
    if (this.groupForm.valid) {
      const groupData = this.prepareSaveData();
      this.dialogRef.close(groupData);
    }
  }

  getRoleNameForAssignment(index: number): string {
    const roleId = this.roleAssignmentsFormArray.at(index)?.get('roleId')?.value;
    if (!roleId) {
        return 'Nové priradenie roly';
    }
    const role = this.localRoles.find(r => r.id === roleId);
    return role?.name ?? 'Neznáma rola';
  }
}
