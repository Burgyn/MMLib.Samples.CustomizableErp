import { Category } from '../../models/evidence.model';
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

@Component({
    selector: 'app-category-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule
    ],
    template: `
        <div class="dialog-container">
            <h2 mat-dialog-title>{{ data.category ? 'Upraviť kategóriu' : 'Nová kategória' }}</h2>
            <mat-dialog-content>
                <mat-form-field class="w-100">
                    <mat-label>Názov kategórie</mat-label>
                    <input matInput [(ngModel)]="category.name" required>
                </mat-form-field>
                <mat-form-field class="w-100">
                    <mat-label>Ikona (názov Bootstrap ikony)</mat-label>
                    <input matInput [(ngModel)]="category.icon" placeholder="napr. bi-folder">
                    <mat-hint>
                        <a href="https://icons.getbootstrap.com/" target="_blank" class="icon-docs-link">
                            Zoznam dostupných ikon
                        </a>
                    </mat-hint>
                </mat-form-field>
                <div class="icon-preview" *ngIf="category.icon">
                    <i class="bi" [class]="category.icon"></i>
                    <span class="ms-2">{{ category.name }}</span>
                </div>
            </mat-dialog-content>
            <mat-dialog-actions align="end">
                <button mat-button (click)="onCancel()">Zrušiť</button>
                <button mat-raised-button color="primary" (click)="onSave()" [disabled]="!category.name">Uložiť</button>
            </mat-dialog-actions>
        </div>
    `,
    styles: [`
        .dialog-container {
            padding: 1rem;
        }

        mat-dialog-content {
            min-width: 300px;
            max-width: 100%;
            padding: 1rem 0;
        }

        mat-form-field {
            margin-bottom: 1rem;
        }

        .icon-preview {
            display: flex;
            align-items: center;
            padding: 0.5rem;
            margin-top: 0.5rem;
            background-color: var(--light-color);
            border-radius: 4px;
        }

        .icon-docs-link {
            color: var(--primary-color);
            text-decoration: none;
        }

        .icon-docs-link:hover {
            text-decoration: underline;
        }

        mat-dialog-actions {
            padding: 1rem 0 0 0;
            margin: 0;
            gap: 0.5rem;
        }

        @media (max-width: 768px) {
            .dialog-container {
                padding: 0.5rem;
            }

            mat-dialog-content {
                min-width: 100%;
                padding: 0.5rem 0;
            }

            mat-form-field {
                margin-bottom: 0.5rem;
            }

            mat-dialog-actions {
                padding: 0.5rem 0 0 0;
            }

            button {
                min-width: 80px;
                height: 40px;
            }
        }
    `]
})
export class CategoryDialogComponent {
    category: Category = {
        id: '',
        name: '',
        icon: 'bi-folder',
        createdAt: new Date(),
        updatedAt: new Date()
    };

    constructor(
        public dialogRef: MatDialogRef<CategoryDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { category?: Category }
    ) {
        if (data.category) {
            this.category = { ...data.category };
        }
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    onSave(): void {
        this.dialogRef.close(this.category);
    }
}
