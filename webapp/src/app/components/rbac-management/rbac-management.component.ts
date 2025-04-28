import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-rbac-management',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule, // Needed for routerLink and router-outlet
    MatTabsModule // Needed for Material Tabs
  ],
  templateUrl: './rbac-management.component.html',
  styleUrl: './rbac-management.component.css'
})
export class RbacManagementComponent {
  navLinks = [
    { path: 'users', label: 'Používatelia' },
    { path: 'roles', label: 'Roly' },
    { path: 'groups', label: 'Skupiny' }
  ];
}
