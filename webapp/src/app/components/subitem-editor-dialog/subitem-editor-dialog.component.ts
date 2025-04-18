import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { SubitemDefinition, SubitemRecord } from '../../models/evidence.model';

@Component({
    selector: 'app-subitem-editor-dialog',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatDialogModule, FormsModule],
    template: `
        <div class="subitem-editor-dialog" role="dialog" aria-labelledby="dialog-title">
            <div class="dialog-header">
                <h2 mat-dialog-title id="dialog-title" class="mb-3">{{ data.subitemDefinition.name }}</h2>
            </div>

            <div mat-dialog-content>
                <div class="content-panel">
                    <form [formGroup]="recordForm" class="form-container p-0">
                        <div class="row">
                            <ng-container *ngFor="let column of data.subitemDefinition.columns">
                                <div class="col-md-6 mb-3">
                                    <label [for]="column.field" class="form-label">{{ column.headerName }}</label>
                                    <ng-container [ngSwitch]="column.type">
                                        <!-- Text input -->
                                        <input *ngSwitchCase="'string'"
                                            [id]="column.field"
                                            type="text"
                                            class="form-control"
                                            [formControlName]="column.field">

                                        <!-- Number input -->
                                        <input *ngSwitchCase="'number'"
                                            [id]="column.field"
                                            type="number"
                                            class="form-control"
                                            [formControlName]="column.field">

                                        <!-- Date input -->
                                        <input *ngSwitchCase="'date'"
                                            [id]="column.field"
                                            type="date"
                                            class="form-control"
                                            [formControlName]="column.field">

                                        <!-- Boolean input -->
                                        <div *ngSwitchCase="'boolean'" class="form-check">
                                            <input class="form-check-input"
                                                type="checkbox"
                                                [id]="column.field"
                                                [formControlName]="column.field">
                                        </div>

                                        <!-- Default text input -->
                                        <input *ngSwitchDefault
                                            [id]="column.field"
                                            type="text"
                                            class="form-control"
                                            [formControlName]="column.field">
                                    </ng-container>
                                </div>
                            </ng-container>
                        </div>
                    </form>
                </div>
            </div>

            <div mat-dialog-actions align="end" class="dialog-actions">
                <button class="btn btn-secondary me-2" (click)="cancel()">Zrušiť</button>
                <button class="btn btn-primary" (click)="save()">Uložiť</button>
            </div>
        </div>
    `,
    styles: [`
        .subitem-editor-dialog {
            min-width: 500px;
            background: var(--component-bg);
            border-radius: 0.375rem;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid var(--border-color);
            box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
            color: var(--text-color);
        }

        .dialog-header {
            padding: 1rem 1.5rem;
            background: var(--component-bg);
            flex-shrink: 0;
            border-bottom: 1px solid var(--border-color);
        }

        .dialog-header h2 {
            color: var(--text-color);
            font-size: 1.5rem;
            font-weight: 500;
            margin-bottom: 0;
        }

        .content-panel {
            background-color: var(--component-bg);
            padding: 1.5rem;
            border-radius: 0.375rem;
        }

        .form-label {
            font-size: 0.875rem;
            font-weight: 500;
            color: var(--text-color);
            margin-bottom: 0.5rem;
        }

        .form-control {
            background-color: var(--component-bg);
            color: var(--text-color);
            border-color: var(--border-color);
        }

        .form-control:focus {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 0.2rem rgba(var(--primary-rgb), 0.25);
        }

        .form-check-input {
            background-color: var(--component-bg);
            border-color: var(--border-color);
        }

        .form-check-input:checked {
            background-color: var(--primary-color);
            border-color: var(--primary-color);
        }

        .dialog-actions {
            padding: 1rem 1.5rem;
            background: var(--component-bg);
            border-top: 1px solid var(--border-color);
        }

        .btn-primary {
            background-color: var(--primary-color);
            border-color: var(--primary-color);
        }

        .btn-secondary {
            background-color: var(--secondary-color);
            border-color: var(--secondary-color);
        }
    `]
})
export class SubitemEditorDialogComponent implements OnInit {
    recordForm: FormGroup;

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<SubitemEditorDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: {
            subitemDefinition: SubitemDefinition;
            record?: SubitemRecord;
            parentRecordId: string;
            mode: 'create' | 'edit';
        }
    ) {
        this.recordForm = this.fb.group({});
    }

    ngOnInit(): void {
        this.initializeFormControls();
    }

    private initializeFormControls(): void {
        // Create form controls for each column
        const formGroup: { [key: string]: any } = {};

        this.data.subitemDefinition.columns.forEach(column => {
            // Get initial value from record if in edit mode
            const initialValue = this.data.mode === 'edit' && this.data.record
                ? this.data.record.data[column.field]
                : null;

            formGroup[column.field] = [initialValue];
        });

        this.recordForm = this.fb.group(formGroup);
    }

    cancel(): void {
        this.dialogRef.close();
    }

    save(): void {
        const formData = this.recordForm.value;

        // Create or update subitem record
        const record: SubitemRecord = this.data.mode === 'edit' && this.data.record
            ? {
                ...this.data.record,
                data: formData
              }
            : {
                id: crypto.randomUUID(),
                parentRecordId: this.data.parentRecordId,
                data: formData,
                createdAt: new Date(),
                updatedAt: new Date()
              };

        this.dialogRef.close(record);
    }
}
