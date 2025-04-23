import { Category, Evidence } from '../../models/evidence.model';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router, RouterModule } from '@angular/router';

import { CategoryDialogComponent } from '../category-dialog/category-dialog.component';
import { CommonModule } from '@angular/common';
import { EvidenceService } from '../../services/evidence.service';
import { Subscription } from 'rxjs';

interface MenuCategory extends Category {
    evidences: Evidence[];
    isExpanded: boolean;
}

@Component({
    selector: 'app-side-menu',
    standalone: true,
    imports: [CommonModule, RouterModule, MatDialogModule, DragDropModule],
    template: `
        <div class="side-menu">
            <div class="menu-header">
                <button class="btn btn-light w-100 text-start mb-2" (click)="createNewCategory()">
                    <i class="bi bi-folder-plus"></i> Nová kategória
                </button>
                <button class="btn btn-light w-100 text-start" (click)="createNewEvidence()">
                    <i class="bi bi-plus-lg"></i> Nová evidencia
                </button>
            </div>

            <div class="menu-categories" cdkDropList (cdkDropListDropped)="onCategoryDrop($event)">
                <div *ngFor="let category of categories" class="menu-category" cdkDrag>
                    <div class="category-header">
                        <div class="d-flex align-items-center flex-grow-1" (click)="toggleCategory(category)">
                            <i class="bi drag-handle" [class]="category.icon || 'bi-folder'"></i>
                            <span class="ms-2">{{ category.name }}</span>
                            <i class="bi expand-icon"
                               [class.bi-chevron-down]="category.isExpanded"
                               [class.bi-chevron-right]="!category.isExpanded"></i>
                        </div>
                        <div class="category-actions">
                            <button class="btn btn-sm btn-link" (click)="editCategory(category)">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-link text-danger" (click)="deleteCategory(category)">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="category-items" *ngIf="category.isExpanded" cdkDropList (cdkDropListDropped)="onEvidenceDrop($event, category)">
                        <a *ngFor="let evidence of category.evidences"
                           [routerLink]="['/evidence', evidence.id]"
                           routerLinkActive="active"
                           class="menu-item"
                           cdkDrag
                           (click)="closeMenu()">
                            <i class="bi" [class]="evidence.icon || 'bi-table'"></i>
                            <span class="ms-2">{{ evidence.name }}</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .side-menu {
            width: 280px;
            height: 100%;
            background: var(--sidebar-bg);
            border-right: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
            padding: 1rem;
            transition: background-color 0.3s ease;
        }

        .menu-header {
            margin-bottom: 1rem;
        }

        .menu-categories {
            flex: 1;
            overflow-y: auto;
        }

        .menu-category {
            margin-bottom: 0.5rem;
        }

        .category-header {
            padding: 0.5rem;
            display: flex;
            align-items: center;
            color: var(--text-color);
            border-radius: 4px;
            transition: background-color 0.2s, color 0.3s ease;

            &:hover {
                background-color: var(--light-color);
            }

            .category-actions {
                display: none;
                margin-left: auto;
            }

            &:hover .category-actions {
                display: flex;
                gap: 0.25rem;
            }
        }

        .expand-icon {
            margin-left: auto;
        }

        .category-items {
            margin-left: 1rem;
            margin-top: 0.25rem;
        }

        .menu-item {
            display: flex;
            align-items: center;
            padding: 0.5rem;
            color: var(--text-muted);
            text-decoration: none;
            border-radius: 4px;
            transition: background-color 0.2s, color 0.3s ease;

            &:hover {
                background-color: var(--light-color);
                color: var(--text-color);
            }

            &.active {
                background-color: rgba(61, 139, 253, 0.2);
                color: var(--primary-color);
            }
        }

        .btn-link {
            padding: 0.25rem;
            color: var(--text-muted);
            transition: color 0.3s ease;

            &:hover {
                color: var(--primary-color);
            }

            &.text-danger:hover {
                color: var(--danger-color) !important;
            }
        }

        .drag-handle {
            cursor: move;
        }

        .cdk-drag-preview {
            box-sizing: border-box;
            border-radius: 4px;
            box-shadow: 0 5px 5px -3px rgba(0, 0, 0, 0.2),
                        0 8px 10px 1px rgba(0, 0, 0, 0.14),
                        0 3px 14px 2px rgba(0, 0, 0, 0.12);
        }

        .cdk-drag-placeholder {
            opacity: 0;
        }

        .cdk-drag-animating {
            transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
        }

        .menu-categories.cdk-drop-list-dragging .menu-category:not(.cdk-drag-placeholder) {
            transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
        }

        .category-items.cdk-drop-list-dragging .menu-item:not(.cdk-drag-placeholder) {
            transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
        }

        @media (max-width: 768px) {
            .side-menu {
                width: 100%;
                max-width: 280px;
            }
        }
    `]
})
export class SideMenuComponent implements OnInit, OnDestroy {
    categories: MenuCategory[] = [];
    private subscriptions: Subscription = new Subscription();

    constructor(
        private evidenceService: EvidenceService,
        private router: Router,
        private dialog: MatDialog
    ) {}

    ngOnInit(): void {
        this.loadCategories();

        // Subscribe to category changes
        const categorySubscription = this.evidenceService.categoryChanged$.subscribe(() => {
            this.loadCategories();
        });

        // Subscribe to evidence changes
        const evidenceSubscription = this.evidenceService.evidenceChanged$.subscribe(() => {
            // Reload evidence for each category
            this.categories.forEach(category => {
                this.loadEvidencesForCategory(category);
            });
        });

        // Add subscriptions to be cleaned up on destroy
        this.subscriptions.add(categorySubscription);
        this.subscriptions.add(evidenceSubscription);
    }

    ngOnDestroy(): void {
        // Clean up subscriptions
        this.subscriptions.unsubscribe();
    }

    private loadCategories(): void {
        this.evidenceService.getAllCategories().subscribe(categories => {
            this.categories = categories.map(c => ({
                ...c,
                evidences: [],
                isExpanded: true
            }));

            // Load evidences for each category
            this.categories.forEach(category => {
                this.loadEvidencesForCategory(category);
            });
        });
    }

    private loadEvidencesForCategory(category: MenuCategory): void {
        this.evidenceService.getEvidencesByCategory(category.id)
            .subscribe(evidences => {
                category.evidences = evidences;
            });
    }

    onCategoryDrop(event: CdkDragDrop<MenuCategory[]>): void {
        moveItemInArray(this.categories, event.previousIndex, event.currentIndex);

        // Update order property for all categories
        this.categories.forEach((category, index) => {
            category.order = index;
            this.evidenceService.saveCategory(category).subscribe();
        });
    }

    onEvidenceDrop(event: CdkDragDrop<Evidence[]>, category: MenuCategory): void {
        moveItemInArray(category.evidences, event.previousIndex, event.currentIndex);

        // Update order property for all evidences in the category
        category.evidences.forEach((evidence, index) => {
            evidence.order = index;
            this.evidenceService.saveEvidence(evidence).subscribe();
        });
    }

    toggleCategory(category: MenuCategory): void {
        category.isExpanded = !category.isExpanded;
    }

    createNewCategory(): void {
        const dialogRef = this.dialog.open(CategoryDialogComponent, {
            width: '400px',
            data: {}
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                // Set the order to be the last in the list
                result.order = this.categories.length;
                this.evidenceService.saveCategory(result).subscribe(() => {
                    this.loadCategories();
                });
            }
        });
    }

    editCategory(category: Category): void {
        const dialogRef = this.dialog.open(CategoryDialogComponent, {
            width: '400px',
            data: { category }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.evidenceService.saveCategory(result).subscribe(() => {
                    this.loadCategories();
                });
            }
        });
    }

    deleteCategory(category: Category): void {
        if (confirm(`Naozaj chcete vymazať kategóriu "${category.name}"?`)) {
            this.evidenceService.deleteCategory(category.id).subscribe(() => {
                this.loadCategories();
            });
        }
    }

    createNewEvidence(): void {
        this.router.navigate(['/evidence/new']);
    }

    closeMenu(): void {
        // This will be handled by the parent component
        const event = new CustomEvent('closeSidebar');
        window.dispatchEvent(event);
    }
}
