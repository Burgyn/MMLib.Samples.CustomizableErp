import { ActivatedRoute, Router } from '@angular/router';
import { ColDef, GridOptions } from 'ag-grid-community';
import { Component, OnInit } from '@angular/core';
import { Evidence, EvidenceRecord } from '../../models/evidence.model';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { AgGridModule } from 'ag-grid-angular';
import { CommonModule } from '@angular/common';
import { EvidenceService } from '../../services/evidence.service';
import { RecordEditorDialogComponent } from '../record-editor-dialog/record-editor-dialog.component';

@Component({
    selector: 'app-evidence-view',
    standalone: true,
    imports: [CommonModule, AgGridModule, MatDialogModule],
    template: `
        <div class="view-container">
            <div class="toolbar">
                <div class="d-flex justify-content-between align-items-center p-3">
                    <h4 class="m-0">{{ evidence?.name }}</h4>
                    <div class="btn-group">
                        <button class="btn btn-primary btn-sm" (click)="createRecord()">
                            <i class="bi bi-plus"></i> New Record
                        </button>
                        <button class="btn btn-outline-secondary btn-sm" (click)="editEvidence()">
                            <i class="bi bi-pencil"></i> Edit Definition
                        </button>
                    </div>
                </div>
            </div>
            <ag-grid-angular
                class="ag-theme-alpine grid-container"
                [rowData]="records"
                [columnDefs]="columnDefs"
                [defaultColDef]="defaultColDef"
                [gridOptions]="gridOptions"
                [pagination]="true"
                [paginationAutoPageSize]="true"
                (gridReady)="onGridReady($event)"
            ></ag-grid-angular>
        </div>
    `,
    styles: [`
        .view-container {
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        .toolbar {
            background-color: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
        }
        .grid-container {
            flex: 1;
            width: 100%;
        }
    `]
})
export class EvidenceViewComponent implements OnInit {
    evidence: Evidence | null = null;
    records: EvidenceRecord[] = [];
    columnDefs: ColDef[] = [];
    gridOptions: GridOptions = {
        defaultColDef: {
            sortable: true,
            filter: true,
            resizable: true
        }
    };
    defaultColDef: ColDef = {
        sortable: true,
        filter: true,
        resizable: true
    };

    constructor(
        private evidenceService: EvidenceService,
        private route: ActivatedRoute,
        private router: Router,
        private dialog: MatDialog
    ) {}

    ngOnInit(): void {
        this.route.params.subscribe(params => {
            if (params['id']) {
                this.loadEvidence(params['id']);
            }
        });
    }

    private loadEvidence(id: string): void {
        this.evidenceService.getEvidence(id).subscribe(evidence => {
            if (evidence) {
                this.evidence = evidence;
                this.setupGrid(evidence);
                this.loadRecords(evidence.id);
            }
        });
    }

    private setupGrid(evidence: Evidence): void {
        this.columnDefs = evidence.gridColumns.map(col => {
            const colDef: ColDef = {
                field: `data.${col.field}`,
                headerName: col.headerName,
                width: col.width,
                sortable: col.sortable,
                filter: col.filter
            };

            // Map column types to AG Grid types
            switch (col.type?.toLowerCase()) {
                case 'number':
                    colDef.type = 'numericColumn';
                    colDef.filter = 'agNumberColumnFilter';
                    break;
                case 'date':
                    colDef.type = 'dateColumn';
                    colDef.filter = 'agDateColumnFilter';
                    colDef.valueFormatter = (params) => {
                        return params.value ? new Date(params.value).toLocaleDateString() : '';
                    };
                    break;
                case 'boolean':
                    colDef.type = 'checkboxColumn';
                    colDef.filter = 'agSetColumnFilter';
                    break;
                default:
                    colDef.type = 'textColumn';
                    colDef.filter = 'agTextColumnFilter';
                    break;
            }

            return colDef;
        });

        // Add action column
        this.columnDefs.push({
            headerName: 'Actions',
            field: 'actions',
            width: 100,
            sortable: false,
            filter: false,
            cellRenderer: (params: any) => {
                return `
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-primary" data-action="edit">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" data-action="delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                `;
            },
            onCellClicked: (params: any) => {
                const action = params.event.target.getAttribute('data-action');
                if (action === 'edit') {
                    this.editRecord(params.data);
                } else if (action === 'delete') {
                    this.deleteRecord(params.data);
                }
            }
        });
    }

    private loadRecords(evidenceId: string): void {
        this.evidenceService.getRecords(evidenceId).subscribe(records => {
            this.records = records;
        });
    }

    createRecord(): void {
        if (!this.evidence) return;

        const dialogRef = this.dialog.open(RecordEditorDialogComponent, {
            data: {
                evidence: this.evidence,
                mode: 'create'
            }
        });

        dialogRef.afterClosed().subscribe((record: Partial<EvidenceRecord>) => {
            if (record && this.evidence) {
                this.evidenceService.saveRecord(this.evidence.id, record as EvidenceRecord)
                    .subscribe(() => {
                        this.loadRecords(this.evidence!.id);
                    });
            }
        });
    }

    editRecord(record: EvidenceRecord): void {
        if (!this.evidence) return;

        const dialogRef = this.dialog.open(RecordEditorDialogComponent, {
            data: {
                evidence: this.evidence,
                record: record,
                mode: 'edit'
            }
        });

        dialogRef.afterClosed().subscribe((updatedRecord: Partial<EvidenceRecord>) => {
            if (updatedRecord && this.evidence) {
                this.evidenceService.saveRecord(this.evidence.id, updatedRecord as EvidenceRecord)
                    .subscribe(() => {
                        this.loadRecords(this.evidence!.id);
                    });
            }
        });
    }

    deleteRecord(record: EvidenceRecord): void {
        if (confirm('Are you sure you want to delete this record?')) {
            this.evidenceService.deleteRecord(record.evidenceId, record.id).subscribe(() => {
                this.loadRecords(record.evidenceId);
            });
        }
    }

    editEvidence(): void {
        if (this.evidence) {
            this.router.navigate(['/evidence', this.evidence.id, 'edit']);
        }
    }

    onGridReady(params: any): void {
        params.api.sizeColumnsToFit();
    }
}
