import { Component, OnInit } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Observable, forkJoin, map, switchMap, tap } from 'rxjs';

import { CommonModule } from '@angular/common';
import { Group } from '../../../models/rbac/group.model';
import { GroupEditorDialogComponent } from '../group-editor-dialog/group-editor-dialog.component';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RbacService } from '../../../services/rbac.service';
import { User } from '../../../models/rbac/user.model';

interface DisplayGroup extends Group {
    memberUserNames?: string[];
    memberGroupNames?: string[];
}

@Component({
  selector: 'app-rbac-groups',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTooltipModule,
    MatDialogModule,
    MatChipsModule,
    GroupEditorDialogComponent
  ],
  templateUrl: './rbac-groups.component.html',
  styleUrl: './rbac-groups.component.css'
})
export class RbacGroupsComponent implements OnInit {

  displayedColumns: string[] = ['name', 'description', 'members', 'actions'];
  groups: DisplayGroup[] = [];
  usersMap = new Map<string, User>();
  groupsMap = new Map<string, Group>();

  constructor(
    private rbacService: RbacService,
    private dialog: MatDialog
    ) { }

  ngOnInit(): void {
    this.refreshData();
  }

  loadGroups(): Observable<DisplayGroup[]> {
    return this.rbacService.getGroups().pipe(
      map(groups => groups.map(group => ({
        ...group,
        memberUserNames: group.memberUserIds?.map(id => this.usersMap.get(id)?.name ?? id),
        memberGroupNames: group.memberGroupIds?.map(id => this.groupsMap.get(id)?.name ?? id)
      })))
    );
  }

  refreshData(): void {
    // Load users and groups into maps first, then load display groups
    forkJoin({
        users: this.rbacService.getUsers(),
        groups: this.rbacService.getGroups()
    }).pipe(
      tap(data => {
          this.usersMap.clear();
          data.users.forEach(u => this.usersMap.set(u.id, u));
          this.groupsMap.clear();
          data.groups.forEach(g => this.groupsMap.set(g.id, g)); // Map groups for nested lookup
          console.log('Refreshed users and groups maps');
      }),
      // Use switchMap to chain loading display groups AFTER maps are populated
      switchMap(() => this.loadGroups())
    ).subscribe(displayGroups => {
        console.log('Refreshed display groups:', displayGroups);
        this.groups = displayGroups;
    }, error => {
        console.error('Error refreshing groups data:', error);
        this.groups = [];
    });
  }

  createNewGroup(): void {
    const dialogRef = this.dialog.open(GroupEditorDialogComponent, {
        width: '600px',
        data: { group: null }
    });
    dialogRef.afterClosed().subscribe(result => {
        if (result) {
            this.rbacService.saveGroup(result).subscribe(() => this.refreshData());
        }
    });
  }

  editGroup(group: Group): void {
    const groupCopy = JSON.parse(JSON.stringify(group));
    const dialogRef = this.dialog.open(GroupEditorDialogComponent, {
        width: '600px',
        data: { group: groupCopy }
    });
    dialogRef.afterClosed().subscribe(result => {
        if (result) {
            this.rbacService.saveGroup(result).subscribe(() => this.refreshData());
        }
    });
  }

  deleteGroup(group: Group): void {
    // Add checks (e.g., cannot delete if member of another group?)
    if (confirm(`Naozaj chcete vymazať skupinu "${group.name}"?`)) {
      this.rbacService.deleteGroup(group.id).subscribe(() => {
        this.refreshData();
      }, error => {
          alert(`Chyba pri mazaní skupiny: ${error.message || error}`);
          console.error(error);
      });
    }
  }
}
