import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { SubitemDefinition, SubitemRecord } from '../../models/evidence.model';
import { EvidenceService } from '../../services/evidence.service';

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
                                    <label [for]="column.field" class="form-label">
                                        {{ column.headerName }}
                                        <span *ngIf="column.isCalculated" class="calculated-badge ms-1" title="Počítané pole">
                                            <i class="bi bi-calculator"></i>
                                        </span>
                                    </label>
                                    <ng-container [ngSwitch]="column.type">
                                        <!-- Text input -->
                                        <input *ngSwitchCase="'string'"
                                            [id]="column.field"
                                            type="text"
                                            class="form-control"
                                            [formControlName]="column.field"
                                            [readOnly]="!!column.isCalculated">

                                        <!-- Number input -->
                                        <input *ngSwitchCase="'number'"
                                            [id]="column.field"
                                            type="number"
                                            class="form-control"
                                            [formControlName]="column.field"
                                            [readOnly]="!!column.isCalculated"
                                            [class.calculated-field]="!!column.isCalculated">

                                        <!-- Date input -->
                                        <input *ngSwitchCase="'date'"
                                            [id]="column.field"
                                            type="date"
                                            class="form-control"
                                            [formControlName]="column.field"
                                            [readOnly]="!!column.isCalculated">

                                        <!-- Boolean input -->
                                        <div *ngSwitchCase="'boolean'" class="form-check">
                                            <input class="form-check-input"
                                                type="checkbox"
                                                [id]="column.field"
                                                [formControlName]="column.field"
                                                [disabled]="!!column.isCalculated">
                                        </div>

                                        <!-- Default text input -->
                                        <input *ngSwitchDefault
                                            [id]="column.field"
                                            type="text"
                                            class="form-control"
                                            [formControlName]="column.field"
                                            [readOnly]="!!column.isCalculated">
                                    </ng-container>
                                    <small *ngIf="column.isCalculated && column.formula" class="form-text text-muted">
                                        Formula: {{ column.formula }}
                                    </small>
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

        .calculated-field {
            background-color: #f8f9fa;
            color: #495057;
        }

        .calculated-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 18px;
            height: 18px;
            background-color: #e9ecef;
            border-radius: 50%;
            font-size: 10px;
            color: #6c757d;
        }

        /* Style for readonly inputs to indicate they are calculated */
        input[readonly].form-control.calculated-field {
            background-color: rgba(var(--primary-rgb), 0.05);
            border-color: rgba(var(--primary-rgb), 0.2);
            color: var(--text-color);
        }
    `]
})
export class SubitemEditorDialogComponent implements OnInit {
    recordForm: FormGroup;
    // Keep track of field dependencies
    fieldDependencies: { [field: string]: string[] } = {};

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<SubitemEditorDialogComponent>,
        private evidenceService: EvidenceService,
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
        this.setupCalculatedFieldDependencies();
    }

    private initializeFormControls(): void {
        // Create form controls for each column
        const formGroup: { [key: string]: any } = {};

        this.data.subitemDefinition.columns.forEach(column => {
            // Get initial value from record if in edit mode
            const initialValue = this.data.mode === 'edit' && this.data.record
                ? this.data.record.data[column.field]
                : null;

            // For calculated fields, just add the control (calculations will be done later)
            formGroup[column.field] = [initialValue, column.isCalculated ? [] : []];
        });

        this.recordForm = this.fb.group(formGroup);
    }

    /**
     * Set up listeners for fields that affect calculated fields
     */
    private setupCalculatedFieldDependencies(): void {
        // Map of calculated fields and their dependent fields
        this.fieldDependencies = {};

        // Find all calculated fields and their dependencies
        this.data.subitemDefinition.columns.forEach(column => {
            if (column.isCalculated && column.formula && column.formulaFields) {
                // Register dependencies
                column.formulaFields.forEach(sourceField => {
                    if (!this.fieldDependencies[sourceField]) {
                        this.fieldDependencies[sourceField] = [];
                    }
                    this.fieldDependencies[sourceField].push(column.field);
                });

                // Initial calculation
                this.updateCalculatedField(column.field);
            }
        });

        // Set up listeners for value changes
        Object.keys(this.fieldDependencies).forEach(sourceField => {
            if (this.recordForm.get(sourceField)) {
                this.recordForm.get(sourceField)!.valueChanges.subscribe(value => {
                    // Update all dependent calculated fields
                    this.fieldDependencies[sourceField].forEach(targetField => {
                        this.updateCalculatedField(targetField);
                    });
                });
            }
        });
    }

    /**
     * Update a single calculated field based on its formula
     */
    private updateCalculatedField(fieldName: string): void {
        const column = this.data.subitemDefinition.columns.find(col => col.field === fieldName);
        if (!column || !column.isCalculated || !column.formula) return;

        // Get current form values and ensure we have the latest values
        const currentValues = { ...this.recordForm.getRawValue() };

        // Use the formula evaluation service
        try {
            const calculatedValue = this.evidenceService.evaluateFormula(column.formula, currentValues);
            this.recordForm.get(fieldName)?.setValue(calculatedValue, { emitEvent: false });
        } catch (error) {
            console.error(`Error calculating field ${fieldName}:`, error);
        }
    }

    cancel(): void {
        this.dialogRef.close();
    }

    save(): void {
        const formData = this.recordForm.value;

        // Make sure calculated fields are updated one final time before saving
        this.data.subitemDefinition.columns
            .filter(col => col.isCalculated && col.formula)
            .forEach(col => {
                this.updateCalculatedField(col.field);
            });

        // Get the final form values after all calculations
        const finalFormData = this.recordForm.value;

        // Create or update subitem record
        const record: SubitemRecord = this.data.mode === 'edit' && this.data.record
            ? {
                ...this.data.record,
                data: finalFormData
              }
            : {
                id: crypto.randomUUID(),
                parentRecordId: this.data.parentRecordId,
                data: finalFormData,
                createdAt: new Date(),
                updatedAt: new Date()
              };

        this.dialogRef.close(record);
    }
}
