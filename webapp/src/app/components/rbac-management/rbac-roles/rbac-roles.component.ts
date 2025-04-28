import { Component, OnInit } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog'; // For Dialog

import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip'; // For tooltips
import { RbacService } from '../../../services/rbac.service';
import { Role } from '../../../models/rbac/role.model';
import { RoleEditorDialogComponent } from '../role-editor-dialog/role-editor-dialog.component'; // Uncommented

// Import RoleEditorDialogComponent


@Component({
  selector: 'app-rbac-roles',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTooltipModule,
    MatDialogModule,
    RoleEditorDialogComponent // Added import
  ],
  templateUrl: './rbac-roles.component.html',
  styleUrl: './rbac-roles.component.css'
})
export class RbacRolesComponent implements OnInit {

  displayedColumns: string[] = ['name', 'description', 'isSystemRole', 'actions'];
  roles: Role[] = [];

  constructor(
    private rbacService: RbacService,
    private dialog: MatDialog
    ) { }

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.rbacService.getRoles().subscribe((roles: Role[]) => {
      this.roles = roles;
    });
  }

  createNewRole(): void {
    const dialogRef = this.dialog.open(RoleEditorDialogComponent, { // Uncommented
      width: '600px',
      data: { role: null } // Pass null for new role
    });

    dialogRef.afterClosed().subscribe(result => { // Uncommented
      if (result) {
        // Ensure isSystemRole is false for new roles created via UI
        result.isSystemRole = false;
        this.rbacService.saveRole(result).subscribe(() => this.loadRoles());
      }
    });
    // alert('Functionality to create new role will be added here.'); // Placeholder removed
  }

  editRole(role: Role): void {
    // Create a copy to avoid modifying the original object directly in the table
    const roleCopy = {
        ...role,
        // Ensure allowedActionIds is always an array, even if undefined/null originally
        allowedActionIds: Array.isArray(role.allowedActionIds) ? [...role.allowedActionIds] : []
    };

    const dialogRef = this.dialog.open(RoleEditorDialogComponent, { // Uncommented
      width: '600px',
      data: { role: roleCopy }
    });

    dialogRef.afterClosed().subscribe(result => { // Uncommented
      if (result) {
        // Preserve the original isSystemRole flag during edit
        result.isSystemRole = role.isSystemRole;
        this.rbacService.saveRole(result).subscribe(() => this.loadRoles());
      }
    });
    // alert(`Functionality to edit role '${role.name}' will be added here.`); // Placeholder removed
  }

  deleteRole(role: Role): void {
    if (role.isSystemRole) {
      alert('Systémové role nie je možné vymazať.');
      return;
    }
    if (confirm(`Naozaj chcete vymazať rolu "${role.name}"?`)) {
      this.rbacService.deleteRole(role.id).subscribe(() => {
        this.loadRoles();
      });
    }
  }
}
