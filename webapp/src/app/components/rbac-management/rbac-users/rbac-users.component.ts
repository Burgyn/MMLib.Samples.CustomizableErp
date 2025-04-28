import { Component, OnInit } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Observable, map, switchMap, tap } from 'rxjs';

import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips'; // For displaying roles
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RbacService } from '../../../services/rbac.service';
import { Role } from '../../../models/rbac/role.model';
import { User } from '../../../models/rbac/user.model';
import { UserEditorDialogComponent } from '../user-editor-dialog/user-editor-dialog.component';

// Interface for user display with resolved role names
interface DisplayUser extends User {
    roleNames?: string[];
}

@Component({
  selector: 'app-rbac-users',
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
    UserEditorDialogComponent
  ],
  templateUrl: './rbac-users.component.html',
  styleUrl: './rbac-users.component.css'
})
export class RbacUsersComponent implements OnInit {

  displayedColumns: string[] = ['name', 'email', 'roles', 'actions'];
  users: DisplayUser[] = [];
  rolesMap = new Map<string, Role>(); // To cache roles for display

  constructor(
    private rbacService: RbacService,
    private dialog: MatDialog
    ) { }

  ngOnInit(): void {
     // Initial data load
     this.refreshData();
  }

  // Load users and map role names
  loadUsers(): Observable<DisplayUser[]> {
    return this.rbacService.getUsers().pipe(
      map(users => users.map(user => ({
        ...user,
        // Ensure roleAssignments is an array before mapping
        roleNames: Array.isArray(user.roleAssignments)
                   ? user.roleAssignments.map(ra => this.rolesMap.get(ra.roleId)?.name ?? 'Neznáma rola')
                   : []
      })))
    );
  }

  // Refresh roles map and user list
  refreshData(): void {
     this.rbacService.getRoles().pipe(
      tap(roles => {
        console.log('Refreshing roles map...', roles);
        this.rolesMap.clear();
        roles.forEach(role => this.rolesMap.set(role.id, role));
      }),
      // Once roles are loaded into the map, load users
      switchMap(() => this.loadUsers())
    ).subscribe(users => {
        console.log('Refreshed users:', users);
        this.users = users;
    }, error => {
        console.error('Error refreshing user data:', error);
        this.users = []; // Clear users on error
    });
  }

  createNewUser(): void {
    const dialogRef = this.dialog.open(UserEditorDialogComponent, {
      width: '700px',
      // Ensure we pass copies of roles/tenants if needed by dialog, though RbacService should handle this
      data: { user: null }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
          console.log('Dialog closed, saving new user:', result);
          this.rbacService.saveUser(result).subscribe({
            next: () => {
                console.log('New user saved successfully, refreshing data...');
                this.refreshData();
            },
            error: (err) => {
                console.error('Error saving new user:', err);
                alert(`Chyba pri ukladaní používateľa: ${err.message || err}`);
            }
        });
      }
    });
  }

  editUser(user: User): void {
    // Create a deep copy for editing to ensure isolation
    const userCopy = JSON.parse(JSON.stringify(user));
     // Ensure roleAssignments is an array in the copy
    if (!Array.isArray(userCopy.roleAssignments)) {
        userCopy.roleAssignments = [];
    }

    const dialogRef = this.dialog.open(UserEditorDialogComponent, {
      width: '700px',
      data: { user: userCopy }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
          console.log('Dialog closed, saving edited user:', result);
           // Ensure the ID from the original user is used if it wasn't editable
          result.id = user.id;
          this.rbacService.saveUser(result).subscribe({
            next: () => {
                console.log('Edited user saved successfully, refreshing data...');
                this.refreshData();
            },
            error: (err) => {
                 console.error('Error saving edited user:', err);
                alert(`Chyba pri ukladaní používateľa: ${err.message || err}`);
            }
        });
      }
    });
  }

  deleteUser(user: User): void {
     if (confirm(`Naozaj chcete vymazať používateľa "${user.name}"?`)) {
      this.rbacService.deleteUser(user.id).subscribe({
        next: () => {
            console.log(`User ${user.id} deleted successfully, refreshing data...`);
            this.refreshData();
        },
        error: (err) => {
            console.error('Error deleting user:', err);
            alert(`Chyba pri mazaní používateľa: ${err.message || err}`);
        }
    });
    }
  }
}
