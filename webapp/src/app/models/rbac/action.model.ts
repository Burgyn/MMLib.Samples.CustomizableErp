export interface Action {
  id: string; // e.g., Kros.Invoicing/documents/invoices/read
  description: string;
  // Optional: Add properties for hierarchical display if needed later
  // parentId?: string;
  // children?: Action[];
}
