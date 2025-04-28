// Represents the scope assigned to a user for a specific role or set of actions
export interface Scope {
  type: string; // e.g., 'tenant', 'warehouse', 'numericRange', 'own'
  value: string | string[]; // e.g., 'tenantId123', 'warehouseId456', ['rangeId1', 'rangeId2'], 'all', 'own'
}

// Represents a role assignment for a user, including applicable scopes
export interface UserRoleAssignment {
  roleId: string;
  scopes: Scope[];
}

export interface User {
  id: string; // Usually email or a unique identifier
  name: string;
  email: string;
  roleAssignments: UserRoleAssignment[];
}
