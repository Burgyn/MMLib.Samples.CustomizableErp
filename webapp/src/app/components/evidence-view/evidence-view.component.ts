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
                    <div class="evidence-title">
                        <h4 class="m-0">{{ evidence?.name }}</h4>
                        <div class="evidence-actions">
                            <button class="btn btn-link edit-button" (click)="editEvidence()">
                                <i class="bi bi-gear"></i>
                            </button>
                            <button class="btn btn-link delete-button" (click)="deleteEvidence()">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="toolbar-actions p-2 border-top">
                    <div class="btn-group">
                        <button class="btn btn-primary" (click)="createRecord()">
                            <i class="bi bi-plus-lg"></i> Nový záznam
                        </button>
                        <button class="btn btn-light" title="Označiť všetko">
                            <i class="bi bi-check-square"></i>
                        </button>
                        <button class="btn btn-light" title="Tlačiť">
                            <i class="bi bi-printer"></i>
                        </button>
                        <button class="btn btn-light" title="Export">
                            <i class="bi bi-download"></i>
                        </button>
                    </div>
                    <div class="flex-grow-1"></div>
                    <div class="search-box">
                        <i class="bi bi-search"></i>
                        <input type="text" class="form-control" placeholder="Hľadať...">
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
            background: #fff;
        }

        .toolbar {
            background-color: #fff;
            border-bottom: 1px solid #dee2e6;
        }

        .evidence-title {
            position: relative;
            display: inline-block;
            padding-right: 5rem;

            .evidence-actions {
                position: absolute;
                right: 0;
                top: 50%;
                transform: translateY(-50%);
                display: flex;
                opacity: 0;
                transition: opacity 0.2s;
            }

            .edit-button, .delete-button {
                padding: 0.25rem;
                color: #6c757d;
            }

            .delete-button {
                color: #dc3545;
            }

            &:hover .evidence-actions {
                opacity: 1;
            }
        }

        .toolbar-actions {
            display: flex;
            align-items: center;
            gap: 1rem;
            background: #f8f9fa;
        }

        .search-box {
            position: relative;
            width: 300px;
        }

        .search-box i {
            position: absolute;
            left: 10px;
            top: 50%;
            transform: translateY(-50%);
            color: #6c757d;
        }

        .search-box input {
            padding-left: 32px;
        }

        .grid-container {
            flex: 1;
            width: 100%;
        }

        .actions {
            display: flex;
            align-items: center;
        }

        :host ::ng-deep .ag-theme-alpine {
            --ag-header-height: 40px;
            --ag-header-foreground-color: #495057;
            --ag-header-background-color: #f8f9fa;
            --ag-row-hover-color: #f8f9fa;
            --ag-selected-row-background-color: #e7f1ff;
            --ag-font-size: 14px;
            --ag-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        .btn-group {
            .btn:not(:first-child) {
                margin-left: -1px;
            }

            .btn:not(:last-child) {
                border-right: 1px solid rgba(0,0,0,0.1);
            }
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
        },
        rowSelection: 'multiple',
        suppressRowClickSelection: true,
        headerHeight: 40,
        rowHeight: 40
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
        // Add checkbox column first
        this.columnDefs = [{
            headerCheckboxSelection: true,
            checkboxSelection: true,
            width: 40,
            pinned: 'left'
        }];

        // Add data columns
        this.columnDefs.push(...evidence.gridColumns.map(col => {
            const colDef: ColDef = {
                field: `data.${col.field}`,
                headerName: col.headerName,
                width: col.width,
                sortable: col.sortable,
                filter: col.filter
            };

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
        }));

        // Add action column
        this.columnDefs.push({
            headerName: 'Akcie',
            field: 'actions',
            width: 100,
            sortable: false,
            filter: false,
            pinned: 'right',
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
        if (confirm('Naozaj chcete vymazať tento záznam?')) {
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

    deleteEvidence(): void {
        if (this.evidence && confirm(`Are you sure you want to delete "${this.evidence.name}"?`)) {
            this.evidenceService.deleteEvidence(this.evidence.id).subscribe({
                next: () => {
                    // Use NavigationEnd event to ensure complete page refresh
                    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
                        this.router.navigate(['/']);
                    });
                },
                error: (err) => {
                    console.error('Error deleting evidence:', err);
                    alert('Failed to delete evidence. Please try again.');
                }
            });
        }
    }

    onGridReady(params: any): void {
        params.api.sizeColumnsToFit();
    }
}

