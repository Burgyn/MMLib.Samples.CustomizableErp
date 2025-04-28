import { Component, Inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms'; // For forms
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'; // For Dialog
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTreeModule, MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree'; // For Tree
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox'; // For Checkbox in Tree
import { MatButtonToggleModule } from '@angular/material/button-toggle'; // For preset buttons
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip'; // Import MatTooltipModule
import { FlatTreeControl } from '@angular/cdk/tree'; // For Tree Control

import { RbacService } from '../../../services/rbac.service';
import { Role } from '../../../models/rbac/role.model';
import { Action } from '../../../models/rbac/action.model';
import { Subject, takeUntil } from 'rxjs';

/** Node structure for action tree */
interface ActionNode {
  id: string;
  name: string;
  description?: string;
  children?: ActionNode[];
  isLeaf?: boolean;
}

/** Flat node structure for action tree */
interface FlatActionNode {
  id: string;
  name: string;
  description?: string;
  level: number;
  expandable: boolean;
  isLeaf: boolean;
}

@Component({
  selector: 'app-role-editor-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTreeModule,
    MatIconModule,
    MatCheckboxModule,
    MatButtonToggleModule, // Add toggle buttons
    MatDividerModule,
    MatTooltipModule // Add MatTooltipModule here
  ],
  templateUrl: './role-editor-dialog.component.html',
  styleUrl: './role-editor-dialog.component.css'
})
export class RoleEditorDialogComponent implements OnInit, OnDestroy {

  roleForm: FormGroup;
  isEditMode: boolean;
  allActions: Action[] = [];
  selectedActionIds = new Set<string>();

  // Tree specific properties
  treeControl: FlatTreeControl<FlatActionNode>;
  treeFlattener: MatTreeFlattener<ActionNode, FlatActionNode>;
  dataSource: MatTreeFlatDataSource<ActionNode, FlatActionNode>;

  // Selected node for permission panel
  selectedNode: FlatActionNode | null = null;
  leafActionsForSelectedNode: Action[] = [];

  private destroy$ = new Subject<void>();

  // Map for display names
  private displayNameMap = new Map<string, string>([
    ['Kros.Invoicing', 'Fakturácia'],
    ['Kros.Warehouse', 'Sklad'], // Simplified name
    ['documents', 'Dokumenty'],
    ['invoices', 'Faktúry'],
    ['priceQuotes', 'Cenové ponuky'], // New
    ['orders', 'Objednávky'], // New
    ['deliveryNotes', 'Dodacie listy'], // New
    ['documentTemplates', 'Šablóny dokumentov'],
    ['warehouses', 'Sklady'],
    ['stockItems', 'Skladové položky'],
    ['nonStockItems', 'Neskladové položky'],
    ['stockMovements', 'Skladové pohyby']
    // Add more mappings as needed
  ]);

  constructor(
    public dialogRef: MatDialogRef<RoleEditorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { role: Role | null },
    private fb: FormBuilder,
    private rbacService: RbacService,
    private cdr: ChangeDetectorRef
  ) {
    this.isEditMode = !!data.role;

    this.roleForm = this.fb.group({
      id: [data.role?.id || null],
      name: [data.role?.name || '', Validators.required],
      description: [data.role?.description || ''],
      isSystemRole: [{ value: data.role?.isSystemRole || false, disabled: true }] // Disable system role editing
    });

    if (this.isEditMode && data.role?.allowedActionIds) {
        data.role.allowedActionIds.forEach(id => this.selectedActionIds.add(id));
    }

    // Initialize Tree
    this.treeFlattener = new MatTreeFlattener(
        this.transformer, node => node.level, node => node.expandable, node => node.children);

    this.treeControl = new FlatTreeControl<FlatActionNode>(node => node.level, node => node.expandable);

    this.dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);
  }

  ngOnInit(): void {
    this.loadActions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadActions(): void {
    this.rbacService.getActions().pipe(takeUntil(this.destroy$)).subscribe(actions => {
      this.allActions = actions;
      this.dataSource.data = this.buildActionTree(actions);
      this.treeControl.expandAll(); // Expand all nodes initially
      // Ensure checkboxes reflect initial selection for edit mode
      if (this.isEditMode) {
        this.checkAllNodesSelection();
      }
    });
  }

  // --- Tree Helper Methods ---

  // Helper to get display name
  private getDisplayName(segment: string): string {
    return this.displayNameMap.get(segment) || segment; // Fallback to segment if no mapping
  }

  private transformer = (node: ActionNode, level: number): FlatActionNode => {
    return {
      id: node.id,
      name: node.name,
      description: node.description,
      level: level,
      expandable: !!node.children && node.children.length > 0,
      isLeaf: !!node.isLeaf // Mark leaf nodes explicitly
    };
  }

  hasChild = (_: number, node: FlatActionNode) => node.expandable;

  isLeafNode = (_: number, node: FlatActionNode) => !node.expandable;

  // Updated buildActionTree to use display names
  buildActionTree(actions: Action[]): ActionNode[] {
    const tree: ActionNode[] = [];
    const map = new Map<string, ActionNode>();

    actions.forEach(action => {
      const parts = action.id.split('/');
      parts.pop(); // Ignore the last part (leaf action)
      let currentPath = '';
      let parentNode: ActionNode | undefined = undefined;
      for (let i = 0; i < parts.length; i++) {
        const segment = parts[i];
        const displayName = this.getDisplayName(segment); // Get display name
        currentPath = i === 0 ? segment : `${currentPath}/${segment}`;
        if (!map.has(currentPath)) {
          // Use displayName for the node's name property
          const newNode: ActionNode = { id: currentPath, name: displayName, children: [] };
          map.set(currentPath, newNode);
          if (parentNode?.children) {
            if (!parentNode.children.some(child => child.id === newNode.id)) {
              parentNode.children.push(newNode);
            }
          } else if (i === 0) {
            if (!tree.some(node => node.id === newNode.id)) {
              tree.push(newNode);
            }
          }
          parentNode = newNode;
        } else {
          parentNode = map.get(currentPath)!;
        }
      }
    });

    const sortNodes = (nodes: ActionNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      nodes.forEach(node => { if (node.children) { sortNodes(node.children); } });
    };
    sortNodes(tree);
    console.log('Built Tree Structure with Display Names:', tree);
    return tree;
  }

  // --- Checkbox Selection Logic ---

  // Check if all descendants of a node are selected
  descendantsAllSelected(node: FlatActionNode): boolean {
    const descendants = this.treeControl.getDescendants(node);
    if (!descendants || descendants.length === 0) {
        // If it's a leaf node, check its own status
        return this.selectedActionIds.has(node.id);
    }
    return descendants.every(child => this.selectedActionIds.has(child.id));
  }

  // Check if some but not all descendants are selected
  descendantsPartiallySelected(node: FlatActionNode): boolean {
    const descendants = this.treeControl.getDescendants(node);
     if (!descendants || descendants.length === 0) {
        return false; // Leaf node cannot be partially selected in this context
    }
    const someSelected = descendants.some(child => this.selectedActionIds.has(child.id));
    return someSelected && !this.descendantsAllSelected(node);
  }

  // Toggle selection for a node and its descendants
  toggleNodeSelection(node: FlatActionNode, checked: boolean): void {
    this.updateSelection(node.id, checked);
    const descendants = this.treeControl.getDescendants(node);
    descendants.forEach(descendant => this.updateSelection(descendant.id, checked));
    // Force update check state for parents
    this.checkAllParentsSelection(node);
  }

  // Toggle selection for a leaf node
  toggleLeafNodeSelection(node: FlatActionNode, checked: boolean): void {
     this.updateSelection(node.id, checked);
     this.checkAllParentsSelection(node);
  }

  // Helper to add/remove from selected set
  private updateSelection(actionId: string, selected: boolean): void {
      if (selected) {
          this.selectedActionIds.add(actionId);
      } else {
          this.selectedActionIds.delete(actionId);
      }
  }

  // Checks all parents of a node to update their indeterminate state
  checkAllParentsSelection(node: FlatActionNode): void {
    let parent: FlatActionNode | null = this.getParentNode(node);
    while (parent) {
      this.checkRootNodeSelection(parent);
      parent = this.getParentNode(parent);
    }
  }

 // Check status of root node and its descendants
  checkRootNodeSelection(node: FlatActionNode): void {
      // This method is primarily used to ensure parent checkboxes update correctly.
      // The actual selected IDs are already managed in `selectedActionIds`.
      // We just need to make sure the UI reflects the state.
      // The `descendantsAllSelected` and `descendantsPartiallySelected` methods handle the UI state.
      // No specific logic needed here now, but keep the structure.
  }

  // Get the parent of a node
  getParentNode(node: FlatActionNode): FlatActionNode | null {
    const currentLevel = node.level;
    if (currentLevel < 1) {
      return null;
    }
    const startIndex = this.treeControl.dataNodes.indexOf(node) - 1;
    for (let i = startIndex; i >= 0; i--) {
      const currentNode = this.treeControl.dataNodes[i];
      if (currentNode.level < currentLevel) {
        return currentNode;
      }
    }
    return null;
  }

   // Initial check for nodes on load (needed for edit mode)
  checkAllNodesSelection(): void {
      this.treeControl.dataNodes.forEach(node => {
          this.checkRootNodeSelection(node);
      });
  }

  // --- Node Selection & Permission Panel Logic ---

  selectNode(node: FlatActionNode): void {
    console.log('Node selected:', node);
    this.selectedNode = node;
    this.leafActionsForSelectedNode = this.getLeafActionsForNode(node);
    this.cdr.detectChanges(); // Update view after selection
  }

  // Gets the direct leaf actions for a selected category node
  getLeafActionsForNode(node: FlatActionNode | null): Action[] {
    if (!node || node.isLeaf) { // We should only select category nodes now
        console.log('getLeafActionsForNode called with null or leaf node.');
         return [];
     }

    const nodeIdPrefix = node.id + '/';
    const directChildrenActions = this.allActions.filter(action => {
        if (!action.id.startsWith(nodeIdPrefix)) {
            return false;
        }
        const remainingPath = action.id.substring(nodeIdPrefix.length);
        // Must not contain any further slashes to be a direct action
        return !remainingPath.includes('/');
    });
    console.log(`Leaf actions for node ${node.id} (${node.name}):`, directChildrenActions);
    return directChildrenActions.sort((a,b)=> a.id.localeCompare(b.id)); // Sort actions
  }

  // Check if a specific action (leaf) is selected
  isActionSelected(actionId: string): boolean {
      return this.selectedActionIds.has(actionId);
  }

  // Toggle selection for a specific action (leaf)
  toggleActionSelection(actionId: string, checked: boolean): void {
      if (checked) {
          this.selectedActionIds.add(actionId);
      } else {
          this.selectedActionIds.delete(actionId);
      }
      console.log('Selected IDs:', this.selectedActionIds);
  }

  // Preset buttons logic - Applies to selected node AND all descendants
  applyPreset(preset: 'all' | 'read-only' | 'none'): void {
    if (!this.selectedNode) return;

    const nodeIdPrefix = this.selectedNode.id;
    // Find ALL actions under the selected node (including deeper descendants)
    const descendantActions = this.allActions.filter(action =>
        action.id === nodeIdPrefix || action.id.startsWith(nodeIdPrefix + '/')
    );

    console.log(`Applying preset '${preset}' to node ${nodeIdPrefix} and its ${descendantActions.length} descendant actions.`);

    descendantActions.forEach(action => {
        let shouldBeSelected = false;
        if (preset === 'all') {
            shouldBeSelected = true;
        } else if (preset === 'read-only') {
            // Assuming 'read' actions end with '/read' or are the node itself if it implies read
            // This logic might need refinement based on exact action naming conventions
            shouldBeSelected = action.id.toLowerCase().endsWith('/read') || action.id === nodeIdPrefix; // Basic read-only logic
        } // 'none' remains false

        this.toggleActionSelection(action.id, shouldBeSelected);
    });

    // Refresh the view for the currently displayed checkboxes
    this.leafActionsForSelectedNode = this.getLeafActionsForNode(this.selectedNode);
    this.cdr.detectChanges();
  }

  // --- Dialog Actions ---

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.roleForm.valid) {
      const roleData = this.roleForm.getRawValue() as Role;
      roleData.allowedActionIds = Array.from(this.selectedActionIds);
       // Ensure isSystemRole is correctly handled (it's disabled in form)
      roleData.isSystemRole = this.data.role?.isSystemRole || false;
      this.dialogRef.close(roleData);
    }
  }
}
