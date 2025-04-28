import { RouterModule, Routes } from '@angular/router';

import { NgModule } from '@angular/core';
import { RbacGroupsComponent } from './rbac-groups/rbac-groups.component';
import { RbacManagementComponent } from './rbac-management.component';
import { RbacRolesComponent } from './rbac-roles/rbac-roles.component';
import { RbacUsersComponent } from './rbac-users/rbac-users.component';

const routes: Routes = [
  {
    path: '',
    component: RbacManagementComponent,
    // Children routes for tabs/sections within the management component
    children: [
      { path: '', redirectTo: 'users', pathMatch: 'full' }, // Default to users tab
      { path: 'users', component: RbacUsersComponent },
      { path: 'roles', component: RbacRolesComponent },
      { path: 'groups', component: RbacGroupsComponent },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RbacManagementRoutingModule { }
