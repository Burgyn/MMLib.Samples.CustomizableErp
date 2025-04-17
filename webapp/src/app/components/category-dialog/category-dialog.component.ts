import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Category } from '../../models/evidence.model';

@Component({
    selector: 'app-category-dialog',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
    template: `
        <div class="p-3">
            <h2 class="mb-4">{{ data.category ? 'Upraviť kategóriu' : 'Nová kategória' }}</h2>
            <form [formGroup]="categoryForm">
                <div class="mb-3">
                    <label class="form-label">Názov</label>
                    <input type="text" class="form-control" formControlName="name">
                </div>
                <div class="mb-3">
                    <label class="form-label">Ikona</label>
                    <div class="input-group">
                        <span class="input-group-text">
                            <i class="bi" [class]="categoryForm.value.icon || 'bi-folder'"></i>
                        </span>
                        <input type="text" class="form-control" formControlName="icon"
                               placeholder="bi-folder">
                    </div>
                    <small class="text-muted">Použite Bootstrap Icons (bi-*)</small>
                </div>
                <div class="mb-3">
                    <label class="form-label">Poradie</label>
                    <input type="number" class="form-control" formControlName="order">
                </div>
            </form>
            <div class="d-flex justify-content-end gap-2 mt-4">
                <button class="btn btn-secondary" (click)="dialogRef.close()">Zrušiť</button>
                <button class="btn btn-primary"
                        [disabled]="!categoryForm.valid"
                        (click)="save()">
                    Uložiť
                </button>
            </div>
        </div>
    `,
    styles: []
})
export class CategoryDialogComponent {
    categoryForm: FormGroup;

    constructor(
        private fb: FormBuilder,
        public dialogRef: MatDialogRef<CategoryDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { category?: Category }
    ) {
        this.categoryForm = this.fb.group({
            name: ['', Validators.required],
            icon: ['bi-folder'],
            order: [0]
        });

        if (data.category) {
            this.categoryForm.patchValue(data.category);
        }
    }

    save(): void {
        if (this.categoryForm.valid) {
            const category: Partial<Category> = {
                ...this.categoryForm.value,
                id: this.data.category?.id
            };
            this.dialogRef.close(category);
        }
    }
}
