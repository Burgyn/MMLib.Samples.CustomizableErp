import { Component, Inject, OnInit, OnDestroy, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule, MatSelect } from '@angular/material/select';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';

import { RbacService } from '../../../services/rbac.service';
import { Group } from '../../../models/rbac/group.model';
import { User } from '../../../models/rbac/user.model';
import { Subject, Observable, combineLatest, map, startWith, takeUntil, switchMap, ReplaySubject } from 'rxjs';
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
    NgxMatSelectSearchModule
  ],
  templateUrl: './group-editor-dialog.component.html',
  styleUrl: './group-editor-dialog.component.css'
})
export class GroupEditorDialogComponent implements OnInit, AfterViewInit, OnDestroy {

  groupForm: FormGroup;
  isEditMode: boolean;

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
      memberIds: [initialMemberIds] // Single control for combined members
    });
  }

  ngOnInit(): void {
      // Load the combined list of users and groups
      this.loadAllMembers();

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

      const groupData: Group = {
        id: formValue.id,
        name: formValue.name,
        description: formValue.description,
        memberUserIds: memberUserIds,
        memberGroupIds: memberGroupIds
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
}
