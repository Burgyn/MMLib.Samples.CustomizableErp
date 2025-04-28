import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select'; // For member selection
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

import { RbacService } from '../../../services/rbac.service';
import { Group } from '../../../models/rbac/group.model';
import { User } from '../../../models/rbac/user.model';
import { Subject, Observable, combineLatest, map, startWith, takeUntil, switchMap } from 'rxjs';
import { filter, first } from 'rxjs/operators';

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
    MatDividerModule
  ],
  templateUrl: './group-editor-dialog.component.html',
  styleUrl: './group-editor-dialog.component.css'
})
export class GroupEditorDialogComponent implements OnInit, OnDestroy {

  groupForm: FormGroup;
  isEditMode: boolean;
  allUsers$: Observable<User[]>;
  allOtherGroups$: Observable<Group[]>; // Groups excluding the one being edited
  private destroy$ = new Subject<void>();

  constructor(
    public dialogRef: MatDialogRef<GroupEditorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { group: Group | null },
    private fb: FormBuilder,
    private rbacService: RbacService
  ) {
    this.isEditMode = !!data.group;

    this.groupForm = this.fb.group({
      id: [data.group?.id || null],
      name: [data.group?.name || '', Validators.required],
      description: [data.group?.description || ''],
      memberUserIds: [data.group?.memberUserIds || []], // Use form control for multi-select
      memberGroupIds: [data.group?.memberGroupIds || []]
    });

    // Load data for dropdowns
    this.allUsers$ = this.rbacService.isInitialized$.pipe(
        filter(init => init), first(),
        switchMap(() => this.rbacService.getUsers()),
        map(users => users.sort((a, b) => a.name.localeCompare(b.name)))
    );
    this.allOtherGroups$ = this.rbacService.isInitialized$.pipe(
        filter(init => init), first(),
        switchMap(() => this.rbacService.getGroups()),
        map(groups => groups
            .filter(g => g.id !== this.data.group?.id) // Exclude self
            .sort((a, b) => a.name.localeCompare(b.name))
        )
    );
  }

  ngOnInit(): void {
    // Potentially load data here if not using async pipe in template
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.groupForm.valid) {
      const groupData = this.groupForm.value as Group;
       // Ensure IDs are handled correctly (e.g., null for new)
       if (!this.isEditMode) {
           groupData.id = null as any; // Or generate ID here if needed before service call
       }
      this.dialogRef.close(groupData);
    }
  }
}
