import { Category, Evidence } from '../../models/evidence.model';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { CategoryDialogComponent } from '../category-dialog/category-dialog.component';
import { CommonModule } from '@angular/common';
import { EvidenceService } from '../../services/evidence.service';

interface MenuCategory extends Category {
    evidences: Evidence[];
    isExpanded: boolean;
}

@Component({
    selector: 'app-side-menu',
    standalone: true,
    imports: [CommonModule, RouterModule, MatDialogModule],
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

            <div class="menu-categories">
                <div *ngFor="let category of categories" class="menu-category">
                    <div class="category-header">
                        <div class="d-flex align-items-center flex-grow-1" (click)="toggleCategory(category)">
                            <i class="bi" [class]="category.icon || 'bi-folder'"></i>
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
                    <div class="category-items" *ngIf="category.isExpanded">
                        <a *ngFor="let evidence of category.evidences"
                           [routerLink]="['/evidence', evidence.id]"
                           routerLinkActive="active"
                           class="menu-item">
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
            background: #f8f9fa;
            border-right: 1px solid #dee2e6;
            display: flex;
            flex-direction: column;
            padding: 1rem;
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
            color: #495057;
            border-radius: 4px;
            transition: background-color 0.2s;

            &:hover {
                background-color: #e9ecef;
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
            color: #495057;
            text-decoration: none;
            border-radius: 4px;
            transition: background-color 0.2s;

            &:hover {
                background-color: #e9ecef;
                color: #495057;
            }

            &.active {
                background-color: #e7f1ff;
                color: #0d6efd;
            }
        }

        .btn-link {
            padding: 0.25rem;
            color: #6c757d;

            &:hover {
                color: #0d6efd;
            }

            &.text-danger:hover {
                color: #dc3545 !important;
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

    toggleCategory(category: MenuCategory): void {
        category.isExpanded = !category.isExpanded;
    }

    createNewEvidence(): void {
        this.router.navigate(['/evidence/new']);
    }

    createNewCategory(): void {
        const dialogRef = this.dialog.open(CategoryDialogComponent, {
            width: '400px',
            data: {}
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
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
}
