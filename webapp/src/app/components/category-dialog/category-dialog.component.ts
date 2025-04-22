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
                    <mat-label>Ikona</mat-label>
                    <mat-select [(ngModel)]="category.icon">
                        <mat-option value="bi-folder">Súbor</mat-option>
                        <mat-option value="bi-folder2">Súbor 2</mat-option>
                        <mat-option value="bi-folder-fill">Súbor (vyplnený)</mat-option>
                        <mat-option value="bi-folder2-open">Otvorený súbor</mat-option>
                        <mat-option value="bi-folder-symlink">Symbolický odkaz</mat-option>
                        <mat-option value="bi-folder-check">Súbor s odškrtnutím</mat-option>
                        <mat-option value="bi-folder-x">Súbor s X</mat-option>
                        <mat-option value="bi-folder-plus">Súbor s plusom</mat-option>
                        <mat-option value="bi-folder-minus">Súbor s mínusom</mat-option>
                    </mat-select>
                </mat-form-field>
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
