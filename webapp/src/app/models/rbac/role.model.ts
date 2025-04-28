export interface Role {
  id: string; // Can be a GUID or a meaningful unique string
  name: string;
  description?: string;
  isSystemRole: boolean;
  allowedActionIds: string[];
}
