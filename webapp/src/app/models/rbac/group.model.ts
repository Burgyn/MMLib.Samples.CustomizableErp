export interface Group {
  id: string;
  name: string;
  description?: string;
  memberUserIds: string[];
  memberGroupIds: string[]; // For nested groups
  roleAssignments: import('./user.model').UserRoleAssignment[]; // Priradené role a rozsahy
}
