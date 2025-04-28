import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { NgModule } from '@angular/core';
import { RbacGroupsComponent } from './rbac-groups/rbac-groups.component';
import { RbacManagementComponent } from './rbac-management.component';
import { RbacManagementRoutingModule } from './rbac-management-routing.module';
import { RbacRolesComponent } from './rbac-roles/rbac-roles.component';
import { RbacUsersComponent } from './rbac-users/rbac-users.component';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    RbacManagementRoutingModule,
    MatTabsModule,
    RbacManagementComponent,
    RbacRolesComponent,
    RbacUsersComponent,
    RbacGroupsComponent
  ],
})
export class RbacManagementModule { }
