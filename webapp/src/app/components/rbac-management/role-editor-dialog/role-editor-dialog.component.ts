import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms'; // For forms
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'; // For Dialog
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTreeModule, MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree'; // For Tree
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox'; // For Checkbox in Tree
import { FlatTreeControl } from '@angular/cdk/tree'; // For Tree Control

import { RbacService } from '../../../services/rbac.service';
import { Role } from '../../../models/rbac/role.model';
import { Action } from '../../../models/rbac/action.model';

/** Node structure for action tree */
interface ActionNode {
  id: string;
  name: string;
  description?: string;
  children?: ActionNode[];
}

/** Flat node structure for action tree */
interface FlatActionNode {
  id: string;
  name: string;
  description?: string;
  level: number;
  expandable: boolean;
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
    MatCheckboxModule
  ],
  templateUrl: './role-editor-dialog.component.html',
  styleUrl: './role-editor-dialog.component.css'
})
export class RoleEditorDialogComponent implements OnInit {

  roleForm: FormGroup;
  isEditMode: boolean;
  allActions: Action[] = [];
  selectedActionIds = new Set<string>();

  // Tree specific properties
  treeControl: FlatTreeControl<FlatActionNode>;
  treeFlattener: MatTreeFlattener<ActionNode, FlatActionNode>;
  dataSource: MatTreeFlatDataSource<ActionNode, FlatActionNode>;

  constructor(
    public dialogRef: MatDialogRef<RoleEditorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { role: Role | null },
    private fb: FormBuilder,
    private rbacService: RbacService
  ) {
    this.isEditMode = !!data.role;

    this.roleForm = this.fb.group({
      id: [data.role?.id || null],
      name: [data.role?.name || '', Validators.required],
      description: [data.role?.description || ''],
      isSystemRole: [data.role?.isSystemRole || false]
      // allowedActionIds will be handled separately via the tree
    });

    if (this.isEditMode && data.role) {
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

  loadActions(): void {
    this.rbacService.getActions().subscribe(actions => {
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

  private transformer = (node: ActionNode, level: number): FlatActionNode => {
    return {
      id: node.id,
      name: node.name,
      description: node.description,
      level: level,
      expandable: !!node.children && node.children.length > 0
    };
  }

  hasChild = (_: number, node: FlatActionNode) => node.expandable;

  isLeafNode = (_: number, node: FlatActionNode) => !node.expandable;

  // Build hierarchical tree from flat action list
  buildActionTree(actions: Action[]): ActionNode[] {
    const tree: ActionNode[] = [];
    const map = new Map<string, ActionNode>();

    // Helper to ensure parent nodes exist
    const ensureNodeExists = (idSegments: string[]): ActionNode => {
        let currentPath = '';
        let parentNode: ActionNode | undefined = undefined;
        for (let i = 0; i < idSegments.length; i++) {
            currentPath = i === 0 ? idSegments[i] : `${currentPath}/${idSegments[i]}`;
            if (!map.has(currentPath)) {
                const newNode: ActionNode = {
                    id: currentPath,
                    name: idSegments[i], // Use the segment as name for intermediate nodes
                    children: []
                };
                map.set(currentPath, newNode);
                if (parentNode && parentNode.children) {
                    parentNode.children.push(newNode);
                } else if (i === 0) {
                    // Check if top-level node already exists (e.g., Kros.Invoicing)
                    const existingTopNode = tree.find(n => n.id === currentPath);
                    if (!existingTopNode) {
                        tree.push(newNode);
                    } else {
                         // If it exists, use the existing one as parent for next level
                         parentNode = existingTopNode;
                         continue; // Skip setting parentNode again below
                    }
                }
                parentNode = newNode;
            } else {
                 parentNode = map.get(currentPath)!;
            }
        }
        return parentNode!;
    };

    actions.forEach(action => {
        const parts = action.id.split('/');
        const leafName = parts.pop()!; // The last part is the specific action name
        const parentNode = ensureNodeExists(parts);

        // Create or update the leaf node with full details
        const leafNode: ActionNode = {
            id: action.id,
            name: leafName,
            description: action.description,
            children: [] // Leaf nodes don't have children array in this context
        };
        map.set(action.id, leafNode);
        if (parentNode && parentNode.children) {
           parentNode.children.push(leafNode);
        }

    });

    // Sort children alphabetically by name
    const sortNodes = (nodes: ActionNode[]) => {
        nodes.sort((a, b) => a.name.localeCompare(b.name));
        nodes.forEach(node => {
            if (node.children && node.children.length > 0) {
                sortNodes(node.children);
            }
        });
    };
    sortNodes(tree);

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

  // --- Dialog Actions ---

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.roleForm.valid) {
      const roleData = this.roleForm.value as Role;
      roleData.allowedActionIds = Array.from(this.selectedActionIds);
      this.dialogRef.close(roleData);
    }
  }
}
