import { Component, Inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { Evidence, EvidenceRecord, SubitemDefinition, SubitemRecord, FormRule, RuleAction, RuleCondition } from '../../models/evidence.model';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AgGridModule } from 'ag-grid-angular';
import { SubitemEditorDialogComponent } from '../subitem-editor-dialog/subitem-editor-dialog.component';
import { EvidenceService } from '../../services/evidence.service';

@Component({
    selector: 'app-record-editor-dialog',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatDialogModule, FormsModule, AgGridModule],
    template: `
        <div class="record-editor-dialog" role="dialog" aria-labelledby="dialog-title">
            <div class="dialog-header">
                <!-- Title -->
                <h2 mat-dialog-title id="dialog-title" class="mb-3">{{ data.evidence.name }}</h2>

                <!-- Document Number -->
                <div class="mb-3">
                    <label for="doc-number" class="form-label">Číslo</label>
                    <input type="text" id="doc-number" class="form-control" [(ngModel)]="documentNumber" placeholder="Zadajte číslo záznamu...">
                </div>

                <!-- Tags -->
                <div class="mb-3">
                    <label class="form-label">Tagy</label>
                    <div class="tags-section">
                        <span *ngFor="let tag of tags; let i = index" class="tag-badge badge me-1" [style.background-color]="getTagColor(tag)">
                            {{ tag }}
                            <button type="button" class="btn-close btn-close-white" aria-label="Remove tag" (click)="removeTag(i)"></button>
                        </span>
                        <div class="add-tag-wrapper d-inline-block position-relative">
                            <input type="text" class="form-control form-control-sm add-tag-input"
                                [(ngModel)]="newTag"
                                placeholder="Pridať tag..."
                                (keyup.enter)="addTag()"
                                (blur)="handleTagBlur()"
                                (input)="filterSuggestions()"
                                #tagInput>
                            <button type="button" class="btn btn-sm btn-outline-secondary add-tag-btn" (click)="addTag()" title="Pridať tag">+</button>
                            <div *ngIf="filteredSuggestions.length > 0 && tagInput.value" class="tag-suggestions">
                                <div *ngFor="let suggestion of filteredSuggestions"
                                    class="tag-suggestion-item"
                                    (click)="selectSuggestion(suggestion)"
                                    [style.background-color]="getTagColor(suggestion, 0.2)">
                                    {{ suggestion }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main Content Panel -->
            <div mat-dialog-content class="content-background">
                <!-- Main Form Card -->
                <div class="content-card mb-4">
                    <form [formGroup]="recordForm" class="form-container p-3" #formContainer>
                        <div [innerHTML]="formHtml" class="form-fields"></div>
                    </form>
                </div>

                <!-- Subitems Sections -->
                <div *ngIf="data.evidence.subitemDefinitions && data.evidence.subitemDefinitions.length > 0" class="mb-4">
                    <div class="content-card subitems-panel">
                        <div class="panel-header">
                            <ul class="nav nav-tabs border-0">
                                <li class="nav-item" *ngFor="let subitemDef of data.evidence.subitemDefinitions; let i = index">
                                    <a class="nav-link" [class.active]="i === 0" data-bs-toggle="tab" [href]="'#subitem-tab-' + subitemDef.id">
                                        {{ subitemDef.name }}
                                    </a>
                                </li>
                            </ul>
                        </div>
                        <div class="panel-body p-0">
                            <div class="tab-content">
                                <ng-container *ngFor="let subitemDef of data.evidence.subitemDefinitions; let i = index">
                                    <div class="tab-pane fade" [class.show]="i === 0" [class.active]="i === 0" [id]="'subitem-tab-' + subitemDef.id">
                                        <div class="p-3">
                                            <div class="d-flex justify-content-between align-items-center mb-3">
                                                <div></div> <!-- Placeholder for grid title -->
                                                <button class="btn btn-primary" (click)="addSubitem(subitemDef)">
                                                    <i class="bi bi-plus-lg me-1"></i> Pridať položku
                                                </button>
                                            </div>

                                            <div class="ag-theme-alpine subitem-grid">
                                                <ag-grid-angular
                                                    [rowData]="getSubitemRows(subitemDef.fieldName)"
                                                    [columnDefs]="getSubitemColumnDefs(subitemDef)"
                                                    [defaultColDef]="{ sortable: true, filter: true, resizable: true }"
                                                    [pagination]="false"
                                                    [domLayout]="'autoHeight'"
                                                    [rowHeight]="40"
                                                ></ag-grid-angular>
                                            </div>
                                        </div>
                                    </div>
                                </ng-container>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="debug-section mt-3" *ngIf="showDebug">
                    <pre class="debug-info">{{ debugInfo }}</pre>
                </div>
            </div>

            <!-- Actions -->
            <div mat-dialog-actions align="end" class="dialog-actions">
                <button class="btn btn-outline-secondary btn-sm me-auto" (click)="toggleDebug()" type="button">
                    <i class="bi" [class.bi-bug]="!showDebug" [class.bi-bug-fill]="showDebug"></i>
                </button>
                <button class="btn btn-secondary me-2" (click)="cancel()" #cancelButton>Zrušiť</button>
                <button class="btn btn-primary" (click)="save()" #saveButton>Uložiť</button>
            </div>
        </div>
    `,
    styles: [`
        /* Apply base font to the host */
        :host {
            display: block;
            font-family: Ubuntu, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Noto Sans, Liberation Sans, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", Segoe UI Symbol, "Noto Color Emoji";
        }
        /* Ensure child elements inherit the host font */
        .record-editor-dialog,
        .record-editor-dialog button,
        .record-editor-dialog input,
        .record-editor-dialog select,
        .record-editor-dialog textarea,
        .record-editor-dialog label,
        .record-editor-dialog .mat-mdc-dialog-content {
            font-family: inherit !important; /* Force font inheritance */
        }
        .record-editor-dialog {
            min-width: auto;
            width: 100%;
            max-width: 100%;
            max-height: 100vh;
            background: var(--component-bg);
            border-radius: 0.375rem;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            height: 100%;
            border: 1px solid var(--border-color);
            box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
        }
        .dialog-header {
            padding: 1rem;
            background: var(--component-bg);
            flex-shrink: 0;
            border-bottom: 1px solid var(--border-color);
        }
        .dialog-header h2 {
            color: var(--text-color);
            font-size: 1.25rem;
            font-weight: 500;
            margin-bottom: 1rem;
        }
        .form-label {
            font-size: 0.875rem;
            font-weight: 500;
            color: var(--text-color);
            margin-bottom: 0.5rem;
        }
        .form-control {
            width: 100%;
            max-width: 100%;
            padding: 0.5rem 0.75rem;
            font-size: 1rem;
            line-height: 1.5;
            border: 1px solid var(--border-color);
            border-radius: 0.25rem;
            background-color: var(--component-bg);
            color: var(--text-color);
        }
        .tags-section {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            align-items: center;
        }
        .tag-badge {
            margin: 0;
            white-space: nowrap;
            font-size: 0.875rem;
            padding: 0.35em 0.65em;
            border-radius: 0.9rem;
        }
        .add-tag-wrapper {
            flex: 1;
            min-width: 150px;
            position: relative;
        }
        .add-tag-input {
            width: 100%;
            padding-right: 2rem;
        }
        .add-tag-btn {
            position: absolute;
            right: 3px;
            top: 50%;
            transform: translateY(-50%);
            height: calc(100% - 6px);
            width: 25px;
            padding: 0;
            line-height: 1;
            border: none;
            background: none;
            font-size: 1.2rem;
            color: var(--text-muted);
            cursor: pointer;
        }
        @media (max-width: 768px) {
            .dialog-header {
                padding: 0.75rem;
            }
            .dialog-header h2 {
                font-size: 1.125rem;
                margin-bottom: 0.75rem;
            }
            .form-control {
                font-size: 1rem;
                padding: 0.375rem 0.75rem;
            }
            .tags-section {
                margin-top: 0.5rem;
            }
            .tag-badge {
                font-size: 0.8125rem;
            }
            .add-tag-wrapper {
                width: 100%;
                margin-top: 0.5rem;
            }
        }
        .form-group-sm {
            margin-bottom: 1rem;
        }
        @media (max-width: 768px) {
            .record-editor-dialog {
                border-radius: 0;
                border: none;
            }
            .dialog-header {
                padding: 0.75rem;
            }
            .content-background {
                padding: 0.75rem;
            }
            .form-group-sm {
                display: flex;
                flex-direction: column;
                margin-bottom: 1rem;
            }
            .col-form-label {
                padding: 0;
                margin-bottom: 0.5rem;
                text-align: left;
            }
            .col-sm-2,
            .col-sm-10 {
                width: 100%;
                padding: 0;
            }
            .form-control,
            .add-tag-input {
                width: 100%;
                max-width: 100%;
            }
            .tags-section {
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem;
                align-items: center;
            }
            .add-tag-wrapper {
                flex: 1;
                min-width: 150px;
            }
            .tag-badge {
                margin: 0;
                white-space: nowrap;
            }
            .form-fields {
                .row {
                    margin: 0;
                }
                .col,
                [class^="col-"] {
                    padding: 0;
                    margin-bottom: 1rem;
                    width: 100%;
                }
                input,
                select,
                textarea {
                    width: 100%;
                    max-width: 100%;
                    margin-bottom: 0;
                }
                label {
                    margin-bottom: 0.5rem;
                }
            }
            .dialog-actions {
                padding: 0.75rem;
                border-top: 1px solid var(--border-color);
                background: var(--component-bg);
                position: sticky;
                bottom: 0;
                z-index: 1;
            }
            .btn {
                min-height: 44px;
                padding: 0.5rem 1rem;
            }
        }
        /* More specific label styling - closer to Faktura */
        .record-editor-dialog .dialog-header .form-label,
        .record-editor-dialog .content-panel .form-label,
        .record-editor-dialog .form-fields label,
        .record-editor-dialog .col-form-label {
            font-size: 0.875rem; /* Consistent label size */
            font-weight: 500; /* Medium weight */
            color: var(--text-color); /* Use text color instead of muted for better visibility */
            margin-bottom: 0.5rem; /* Standard Bootstrap label margin */
            display: block;
        }
        .record-editor-dialog .dialog-header .form-control,
        .record-editor-dialog .dialog-header .add-tag-input {
            background-color: var(--component-bg);
            border-radius: 0.25rem;
            border: 1px solid var(--border-color);
            font-family: inherit; /* Inherit font */
            font-size: 1rem; /* Standard font size */
            padding: 0.375rem 0.75rem; /* Standard padding */
            color: var(--text-color);
        }

        /* Content background and cards */
        .content-background {
            background-color: var(--app-bg);
            flex-grow: 1;
            overflow-y: auto;
            padding: 1.5rem;
            color: var(--text-color);
        }

        .content-card {
            background-color: var(--component-bg);
            border-radius: 0.5rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            overflow: hidden;
            border: 1px solid var(--border-color);
        }

        .form-container {
            padding: 0;
            overflow: visible;
            width: 100%;
            box-sizing: border-box;
        }
        .form-fields {
            /* Styles for dynamically generated fields */
        }
        /* More specific input/select/textarea styling - closer to Faktura & more airy */
        .record-editor-dialog .form-fields .form-control,
        .record-editor-dialog .form-fields input[type="text"],
        .record-editor-dialog .form-fields input[type="number"],
        .record-editor-dialog .form-fields input[type="date"],
        .record-editor-dialog .form-fields input[type="email"],
        .record-editor-dialog .form-fields select,
        .record-editor-dialog .form-fields textarea {
            width: 100%;
            padding: 0.375rem 0.75rem; /* Standard Bootstrap padding */
            font-size: 1rem; /* Standard Bootstrap font size */
            font-weight: 400;
            line-height: 1.5;
            color: var(--text-color);
            background-color: var(--component-bg);
            border: 1px solid var(--border-color);
            border-radius: 0.25rem;
            transition: border-color .15s ease-in-out, box-shadow .15s ease-in-out;
            margin-bottom: 1.5rem; /* Increased spacing below field */
            font-family: inherit;
        }
        .record-editor-dialog .form-fields .form-control:focus,
        .record-editor-dialog .form-fields input:focus,
        .record-editor-dialog .form-fields select:focus,
        .record-editor-dialog .form-fields textarea:focus {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 0.2rem rgba(var(--primary-rgb), 0.25);
            outline: 0;
        }
        /* Grid layout styling for rendering GrapesJS rows and cells */
        .record-editor-dialog .form-fields .row {
            display: flex;
            flex-wrap: wrap;
            margin-right: -0.75rem;
            margin-left: -0.75rem;
            margin-bottom: 1rem;
        }
        .record-editor-dialog .form-fields .col,
        .record-editor-dialog .form-fields [class^="col-"] {
            position: relative;
            width: 100%;
            padding-right: 0.75rem;
            padding-left: 0.75rem;
            box-sizing: border-box;
        }
        .record-editor-dialog .form-fields .gjs-row {
            display: flex;
            flex-wrap: wrap;
            margin-bottom: 1.5rem;
        }
        .record-editor-dialog .form-fields .gjs-cell {
            flex: 1 0 0%;
            padding: 0 0.75rem;
        }
        /* Reset margin-bottom on fields inside columns to prevent extra spacing */
        .record-editor-dialog .form-fields .col .form-control,
        .record-editor-dialog .form-fields .gjs-cell .form-control,
        .record-editor-dialog .form-fields .col select,
        .record-editor-dialog .form-fields .gjs-cell select,
        .record-editor-dialog .form-fields .col .mb-3,
        .record-editor-dialog .form-fields .gjs-cell .mb-3 {
            margin-bottom: 0.75rem;
        }
        /* Override GrapesJS block margin if needed, but prefer margin on inputs */
        .record-editor-dialog .form-fields .mb-3 {
            /* margin-bottom: 1.5rem !important; */ /* Maybe not needed if inputs have margin */
        }
        .dialog-actions {
            padding: 1rem 1.5rem;
            border-top: 1px solid var(--border-color);
            background: var(--component-bg);
            display: flex;
            align-items: center;
            flex-shrink: 0;
        }
        .dialog-actions .btn {
            font-size: 0.875rem;
            padding: 0.375rem 0.75rem;
            border-radius: 0.25rem;
            font-family: inherit; /* Inherit font */
        }
        .dialog-actions .btn-primary {
            background-color: var(--primary-color);
            border-color: var(--primary-color);
        }
        .dialog-actions .btn-secondary {
            background-color: var(--secondary-color);
            border-color: var(--secondary-color);
        }
        .debug-section {
            border-top: 1px solid var(--border-color);
            padding-top: 1rem;
            margin-top: 1.5rem;
        }
        .debug-info {
            font-size: 12px;
            background: var(--light-color);
            padding: 1rem;
            border-radius: 4px;
            white-space: pre-wrap;
            word-break: break-word;
            max-height: 300px;
            overflow: auto;
            color: var(--text-color);
        }

        /* Panel styling for subitems */
        .subitems-panel {
            display: flex;
            flex-direction: column;
            background-color: var(--component-bg);
        }

        .panel-header {
            padding: 0.75rem 1rem 0;
            border-bottom: 1px solid var(--border-color);
            background-color: var(--component-bg);
        }

        .panel-body {
            flex: 1;
            background-color: var(--component-bg);
        }

        .tab-content {
            background-color: var(--component-bg);
        }

        .tab-pane {
            background-color: var(--component-bg);
        }

        .nav-tabs {
            border-bottom: none;
            background-color: var(--component-bg);
        }

        .nav-tabs .nav-link {
            border: none;
            border-bottom: 2px solid transparent;
            border-radius: 0;
            color: var(--text-color);
            padding: 0.5rem 1rem;
            margin-right: 0.5rem;
            font-weight: 500;
        }

        .nav-tabs .nav-link.active {
            color: var(--primary-color);
            background-color: transparent;
            border-bottom: 2px solid var(--primary-color);
        }

        .subitem-grid {
            width: 100%;
            min-height: 150px;
            color: var(--text-color);
        }

        .tab-pane .p-3 {
            background-color: var(--component-bg);
            color: var(--text-color);
        }

        /* Fix focus state of inputs inside the dialog */
        .record-editor-dialog input:focus,
        .record-editor-dialog select:focus,
        .record-editor-dialog textarea:focus {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 0.2rem rgba(var(--primary-rgb), 0.25);
            outline: 0;
        }

        .ag-theme-alpine {
            --ag-header-height: 40px;
            --ag-header-foreground-color: var(--text-color);
            --ag-header-background-color: var(--header-bg);
            --ag-odd-row-background-color: var(--component-bg);
            --ag-row-hover-color: var(--light-color);
            --ag-selected-row-background-color: rgba(var(--primary-rgb, 61, 139, 253), 0.2);
            --ag-font-size: 14px;
            --ag-font-family: inherit;
        }

        .tags-section {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 0.35rem;
        }
        .tag-badge {
            font-size: 0.8em;
            padding: 0.35em 0.6em;
            display: inline-flex;
            align-items: center;
            color: white;
            border-radius: 0.9rem;
            font-weight: normal;
            border: none;
        }
        .tag-badge .btn-close {
            margin-left: 0.5em;
            width: 0.5em;
            height: 0.5em;
            filter: brightness(0) invert(1);
            opacity: 0.7;
        }
        .tag-badge .btn-close:hover {
            opacity: 1;
        }
        .add-tag-wrapper {
            position: relative;
            display: inline-flex;
            align-items: center;
        }
        .add-tag-input {
            min-width: 120px;
            width: auto;
            padding-right: 30px;
            display: inline-block;
            font-size: 0.875rem;
            padding: 0.25rem 0.5rem;
            height: calc(1.5em + 0.5rem + 2px);
            border-radius: 0.9rem;
        }
        .add-tag-btn {
            position: absolute;
            right: 3px;
            top: 50%;
            transform: translateY(-50%);
            height: calc(100% - 6px);
            width: 25px;
            padding: 0;
            line-height: 1;
            border: none;
            background: none;
            font-size: 1.2rem;
            color: var(--text-muted);
            cursor: pointer;
        }
        .tag-suggestions {
            position: absolute;
            top: 100%;
            left: 0;
            width: 100%;
            max-height: 150px;
            overflow-y: auto;
            background-color: var(--component-bg);
            border: 1px solid var(--border-color);
            border-radius: 0.25rem;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            z-index: 1050;
        }
        .tag-suggestion-item {
            padding: 0.35rem 0.6rem;
            cursor: pointer;
            border-bottom: 1px solid var(--border-color);
        }
        .tag-suggestion-item:last-child {
            border-bottom: none;
        }
        .tag-suggestion-item:hover {
            background-color: var(--light-color);
        }
        .mat-mdc-dialog-actions {
            flex-shrink: 0;
        }

        /* Partner details styling */
        .partner-details {
            margin-bottom: 1rem !important;
            font-size: 0.875rem;
            color: var(--text-muted);
        }
        .partner-details-content {
            padding: 0.5rem;
            border: 1px solid var(--border-color);
            border-radius: 0.25rem;
            background-color: var(--app-bg);
            margin-top: 0.25rem;
            color: var(--text-color);
        }
        .detail-line {
            margin-bottom: 0.25rem;
        }
        .detail-line:last-child {
            margin-bottom: 0;
        }
        .detail-item {
            display: inline-block;
            margin-right: 1rem;
        }
        .detail-item:last-child {
            margin-right: 0;
        }

        /* Form controls in dark theme */
        body.dark-theme,
        body.dark-blue-theme,
        body.dark-purple-theme,
        body.dark-green-theme,
        body.dark-orange-theme,
        body.soft-dark-theme {
            .record-editor-dialog input,
            .record-editor-dialog select,
            .record-editor-dialog textarea {
                background-color: var(--component-bg);
                color: var(--text-color);
                border-color: var(--border-color);
            }

            .record-editor-dialog .form-control:focus,
            .record-editor-dialog input:focus,
            .record-editor-dialog select:focus,
            .record-editor-dialog textarea:focus {
                border-color: var(--primary-color);
                box-shadow: 0 0 0 0.2rem rgba(var(--primary-rgb), 0.25);
            }

            /* Table headers and cells */
            .record-editor-dialog .ag-header {
                background-color: var(--header-bg);
                color: var(--text-color);
            }

            .record-editor-dialog .ag-row {
                background-color: var(--component-bg);
                color: var(--text-color);
            }

            .record-editor-dialog .ag-row:hover {
                background-color: var(--light-color);
            }

            /* Tab navigation */
            .record-editor-dialog .nav-tabs .nav-link {
                color: var(--text-color);
            }

            .record-editor-dialog .nav-tabs .nav-link:hover {
                color: var(--primary-color);
            }

            .record-editor-dialog .nav-tabs .nav-link.active {
                color: var(--primary-color);
                border-bottom-color: var(--primary-color);
            }

            /* Buttons */
            .record-editor-dialog .btn-outline-primary {
                color: var(--primary-color);
                border-color: var(--primary-color);
            }

            .record-editor-dialog .btn-outline-primary:hover {
                background-color: var(--primary-color);
                color: #fff;
            }

            .record-editor-dialog .btn-outline-secondary {
                color: var(--secondary-color);
                border-color: var(--secondary-color);
            }

            .record-editor-dialog .btn-outline-secondary:hover {
                background-color: var(--secondary-color);
                color: #fff;
            }

            .record-editor-dialog .btn-outline-danger {
                color: var(--danger-color);
                border-color: var(--danger-color);
            }

            .record-editor-dialog .btn-outline-danger:hover {
                background-color: var(--danger-color);
                color: #fff;
            }
        }

        .record-editor-dialog .mb-3 label.col-sm-2.col-form-label {
            font-weight: 500;
            color: var(--text-color);
        }

        /* Reference details styling */
        .reference-details {
            margin-bottom: 1rem !important;
            font-size: 0.875rem;
            color: var(--text-muted);
        }
        .reference-details-content {
            padding: 0.5rem;
            border: 1px solid var(--border-color);
            border-radius: 0.25rem;
            background-color: var(--app-bg);
            margin-top: 0.25rem;
            color: var(--text-color);
        }
        .detail-line {
            margin-bottom: 0.25rem;
        }
        .detail-line:last-child {
            margin-bottom: 0;
        }
        .detail-label {
            font-weight: 500;
            margin-right: 0.5rem;
        }
    `]
})
export class RecordEditorDialogComponent implements OnInit {
    @ViewChild('formContainer') formContainer!: ElementRef;
    @ViewChild('cancelButton') cancelButton!: ElementRef;
    @ViewChild('saveButton') saveButton!: ElementRef;
    @ViewChild('tagInput') tagInput!: ElementRef;

    recordForm: FormGroup;
    formHtml: SafeHtml;
    debugInfo: string = '';
    showDebug: boolean = false;

    // Map to store full partner data for selects that use data-partners
    partnerDataMap: { [selectName: string]: any[] } = {};

    // Properties for document number and tags
    documentNumber: string = '';
    tags: string[] = [];
    newTag: string = '';
    tagSuggestions: string[] = [];
    filteredSuggestions: string[] = [];
    tagColors: { [key: string]: string } = {};

    // Subitems state
    subitems: { [fieldName: string]: SubitemRecord[] } = {};

    // Add to class properties:
    private referenceDataMap: { [selectName: string]: any[] } = {};

    constructor(
        private fb: FormBuilder,
        private sanitizer: DomSanitizer,
        private dialogRef: MatDialogRef<RecordEditorDialogComponent>,
        private dialog: MatDialog,
        private evidenceService: EvidenceService,
        @Inject(MAT_DIALOG_DATA) public data: {
            evidence: Evidence;
            record?: EvidenceRecord;
            mode: 'create' | 'edit';
        }
    ) {
        this.recordForm = this.fb.group({}); // Dynamic controls will be added later
        console.log('Evidence Data:', data.evidence);
        this.debugInfo = `Form Definition: ${data.evidence.formDefinition}`;
        this.formHtml = this.sanitizer.bypassSecurityTrustHtml(
            this.extractFormHtml(data.evidence.formDefinition)
        );

        // Configure dialog size
        this.dialogRef.addPanelClass('record-editor-dialog-container');
        // Set a larger default size
        this.dialogRef.updateSize('80vw', '85vh');

        // Load documentNumber and tags if editing
        if (this.data.mode === 'edit' && this.data.record) {
            this.documentNumber = this.data.record.documentNumber || '';
            this.tags = [...(this.data.record.tags || [])];
        }

        // Load saved tags from localStorage
        this.loadTagSuggestions();

        // Initialize subitems
        this.subitems = {};
    }

    toggleDebug(): void {
        this.showDebug = !this.showDebug;
    }

    private extractFormHtml(formDefinition: string): string {
        try {
            const definition = JSON.parse(formDefinition);
            this.debugInfo += `\nParsed Definition: ${JSON.stringify(definition, null, 2)}`;

            if (!definition.pages?.[0]?.frames?.[0]) {
                this.debugInfo += '\nNo frames found in definition';
                return '';
            }

            const frame = definition.pages[0].frames[0];
            this.debugInfo += `\nFrame: ${JSON.stringify(frame, null, 2)}`;

            const components = frame.component?.components || frame.components || [];
            this.debugInfo += `\nComponents: ${JSON.stringify(components, null, 2)}`;

            const generateHtmlFromComponent = (comp: any): string => {
                this.debugInfo += `\nProcessing component: ${JSON.stringify(comp, null, 2)}`;

                if (comp.type === 'textnode' && comp.content) {
                    // Sanitize text content to prevent potential XSS if content can be user-generated in complex ways
                    const tempDiv = document.createElement('div');
                    tempDiv.textContent = comp.content;
                    return tempDiv.innerHTML;
                }

                // Determine the tag name more robustly
                let tagName = comp.tagName;
                if (!tagName) {
                    switch (comp.type) {
                        case 'label': tagName = 'label'; break;
                        case 'button': tagName = 'button'; break;
                        // Map GrapesJS input types to HTML input tag
                        case 'text-input':
                        case 'number-input':
                        case 'date-input':
                        case 'checkbox': tagName = 'input'; break;
                        case 'select': tagName = 'select'; break;
                        case 'textarea': tagName = 'textarea'; break;
                        case 'option': tagName = 'option'; break;
                        default: tagName = 'div'; // Default to div for components like Row, Cell, or unknown types
                    }
                }

                // Build attributes string
                let attributesObj: { [key: string]: any } = { ...(comp.attributes || {}) };

                // Ensure input elements have a name and type based on GrapesJS component type
                if (tagName === 'input') {
                    if (!attributesObj['name']) {
                        attributesObj['name'] = attributesObj['id'] || `field_${Math.random().toString(36).substr(2, 9)}`;
                    }
                    if (!attributesObj['type']) {
                        switch (comp.type) {
                            case 'number-input': attributesObj['type'] = 'number'; break;
                            case 'date-input': attributesObj['type'] = 'date'; break;
                            case 'checkbox': attributesObj['type'] = 'checkbox'; break;
                            case 'text-input': // Fallthrough intended
                            default: attributesObj['type'] = 'text'; break;
                        }
                    }
                } else if (tagName === 'select' || tagName === 'textarea') {
                    if (!attributesObj['name']) {
                        attributesObj['name'] = attributesObj['id'] || `field_${Math.random().toString(36).substr(2, 9)}`;
                    }
                }

                // Add classes from component to attributes
                let classes = '';
                if (comp.classes) {
                    classes = comp.classes.map((c: any) => typeof c === 'string' ? c : c.name).join(' ');
                }

                // Add special Bootstrap layout classes based on component type/name
                if (comp.name === 'Row') {
                    classes += ' row'; // Add Bootstrap row class
                } else if (comp.name === 'Cell') {
                    // For cells, add Bootstrap column classes
                    // Default to equal width columns if width not specified
                    classes += ' col';
                }

                if (classes) {
                    attributesObj['class'] = `${attributesObj['class'] ? attributesObj['class'] + ' ' : ''}${classes}`.trim();
                }

                let attributes = Object.entries(attributesObj)
                        .map(([key, value]) => `${key}="${value}"`)
                        .join(' ');

                // Handle void elements (elements that don't need a closing tag)
                const voidElements = ['input', 'img', 'br', 'hr'];
                if (voidElements.includes(tagName) || comp.void) { // Also respect GrapesJS void property
                    return `<${tagName} ${attributes.trim()} />`;
                }

                // Recursively generate HTML for child components
                let childrenHtml = '';
                if (comp.components && Array.isArray(comp.components)) {
                    childrenHtml = comp.components.map((child: any) => generateHtmlFromComponent(child)).join('');
                }

                // Add content for non-container elements if no children are present
                let content = '';
                if (!childrenHtml && comp.content) {
                    // Sanitize text content
                    const tempDiv = document.createElement('div');
                    tempDiv.textContent = comp.content;
                    content = tempDiv.innerHTML;
                }

                // Handle options from data-partners attribute for select elements
                if (tagName === 'select' && attributesObj['data-partners'] && typeof attributesObj['data-partners'] === 'string') {
                    try {
                        // Basic attempt to decode HTML entities, might need more robust solution
                        const tempTextarea = document.createElement('textarea');
                        tempTextarea.innerHTML = attributesObj['data-partners'];
                        const decodedJson = tempTextarea.value;

                        const partners = JSON.parse(decodedJson);
                        if (Array.isArray(partners)) {
                            // Store full partner data in the component map
                            const selectName = attributesObj['name'];
                            if (selectName) {
                                this.partnerDataMap[selectName] = partners;
                            }

                            // Generate options with name as value
                            childrenHtml = partners.map(partner => {
                                const partnerId = partner.id || ''; // Keep ID if needed elsewhere, but not for value
                                const partnerName = partner.name || '';
                                // Sanitize partnerName for display text and value
                                const tempDiv = document.createElement('div');
                                tempDiv.textContent = partnerName;
                                const sanitizedName = tempDiv.innerHTML;
                                // Use sanitized name for both value and text content
                                return `<option value="${sanitizedName}">${sanitizedName}</option>`;
                            }).join('');
                        }
                        // Remove the attribute after processing
                        delete attributesObj['data-partners'];
                        // Re-generate attributes string
                        attributes = Object.entries(attributesObj)
                            .map(([key, value]) => `${key}="${value}"`)
                            .join(' ');

                    } catch (e) {
                        console.error(`Error parsing data-partners attribute for ${attributesObj['name'] || 'select'}:`, e, attributesObj['data-partners']);
                        this.debugInfo += `\nError parsing data-partners for ${attributesObj['name']}: ${e}`;
                        childrenHtml = ''; // Clear children if parsing fails
                    }

                    // Generate the select tag and the details container div
                    const selectHtml = `<${tagName} ${attributes.trim()}>${content}${childrenHtml}</${tagName}>`;
                    const detailsDivHtml = `<div class="partner-details" id="details-${attributesObj['name']}"></div>`;
                    return selectHtml + detailsDivHtml;
                }

                // Special handling for iban-select - use original children or options from the component definition
                if (tagName === 'select' && attributesObj['data-gjs-type'] === 'iban-select') {
                    // We should not need this anymore, but keep it in case there are old forms that used it
                    console.log('Found old iban-select component - consider updating your form to regular select');

                    // Use hardcoded IBAN options
                    childrenHtml = `
                        <option value="">Vyberte IBAN...</option>
                        <option value="1">SK1234567890123456789012</option>
                        <option value="2">SK9876543210987654321098</option>
                        <option value="3">SK4567890123456789012345</option>
                        <option value="4">SK7890123456789012345678</option>
                    `;

                    return `<${tagName} ${attributes.trim()}>${childrenHtml}</${tagName}>`;
                }

                // Handle reference-select components
                if (tagName === 'select' && comp.type === 'reference-select') {
                    this.debugInfo += '\n=== Processing reference-select component ===';
                    this.debugInfo += `\nOriginal attributes: ${JSON.stringify(attributesObj)}`;

                    const targetEvidenceId = attributesObj['targetEvidenceId'] || attributesObj['data-target-evidence'];
                    const displayPattern = attributesObj['displayPattern'] || attributesObj['data-display-pattern'];

                    this.debugInfo += `\nExtracted values:`;
                    this.debugInfo += `\n- targetEvidenceId: ${targetEvidenceId}`;
                    this.debugInfo += `\n- displayPattern: ${displayPattern}`;

                    // Remove non-data attributes that should be in data- form
                    delete attributesObj['targetEvidenceId'];
                    delete attributesObj['displayPattern'];

                    // Ensure data attributes are present
                    attributesObj['data-gjs-type'] = 'reference-select';
                    attributesObj['data-target-evidence'] = targetEvidenceId;
                    attributesObj['data-display-pattern'] = displayPattern;

                    // Re-generate attributes string
                    attributes = Object.entries(attributesObj)
                        .map(([key, value]) => `${key}="${value}"`)
                        .join(' ');

                    this.debugInfo += `\nUpdated attributes: ${JSON.stringify(attributesObj)}`;

                    // Generate the select tag and the details container div
                    const selectHtml = `<${tagName} ${attributes.trim()}>${content}${childrenHtml}</${tagName}>`;
                    const detailsDivHtml = `<div class="reference-details" id="details-${attributesObj['name']}"></div>`;

                    this.debugInfo += `\nGenerated HTML: ${selectHtml + detailsDivHtml}`;
                    this.debugInfo += '\n=== End processing reference-select component ===\n';

                    return selectHtml + detailsDivHtml;
                }

                // Default return for components not handled above (including selects without data-partners)
                return `<${tagName} ${attributes.trim()}>${content}${childrenHtml}</${tagName}>`;
            };

            let html = components.map((comp: any) => generateHtmlFromComponent(comp)).join('');

            this.debugInfo += `\nGenerated HTML: ${html}`;
            return html;
        } catch (e) {
            this.debugInfo += `\nError parsing form definition: ${e}`;
            console.error('Failed to parse form definition:', e);
            return '';
        }
    }

    private updatePartnerDetails(selectElement: HTMLSelectElement): void {
        const selectedName = selectElement.value;
        const selectName = selectElement.name;
        const detailsDivId = `details-${selectName}`;
        const detailsDiv = this.formContainer.nativeElement.querySelector(`#${detailsDivId}`);

        if (!detailsDiv) {
            console.warn(`Details container not found for select: ${selectName}`);
            return;
        }

        // Clear details if no partner is selected or data is missing
        if (!selectedName || !this.partnerDataMap[selectName]) {
            detailsDiv.innerHTML = '';
            return;
        }

        const partners = this.partnerDataMap[selectName];
        const selectedPartner = partners.find(p => p.name === selectedName);

        if (selectedPartner) {
            // Format details (assuming fields like address, ico, ic_dph exist)
            let detailsHtml = '<div class="partner-details-content">';
            if (selectedPartner.address) {
                detailsHtml += `<div class="detail-line">${this.sanitizer.sanitize(1, selectedPartner.address)}</div>`;
            }
            if (selectedPartner.ico || selectedPartner.ic_dph) {
                detailsHtml += `<div class="detail-line">`;
                if (selectedPartner.ico) {
                    detailsHtml += `<span class="detail-item">IČO: ${this.sanitizer.sanitize(1, selectedPartner.ico)}</span>`;
                }
                if (selectedPartner.ico && selectedPartner.ic_dph) {
                    detailsHtml += ` `;
                }
                if (selectedPartner.ic_dph) {
                    detailsHtml += `<span class="detail-item">IČ DPH: ${this.sanitizer.sanitize(1, selectedPartner.ic_dph)}</span>`;
                }
                detailsHtml += `</div>`;
            }
            detailsHtml += '</div>';

            // Use bypassSecurityTrustHtml carefully if generated HTML is complex or dynamic
            // For simple text display, sticking to sanitize might be safer if possible
            detailsDiv.innerHTML = detailsHtml; // Update the div content
        } else {
            detailsDiv.innerHTML = ''; // Clear if partner not found (should not happen ideally)
        }
    }

    private updateReferenceDetails(selectElement: HTMLSelectElement): void {
        const selectedId = selectElement.value;
        const selectName = selectElement.name;
        const detailsDivId = `details-${selectName}`;

        this.debugInfo += `\n=== Updating reference details ===`;
        this.debugInfo += `\n- Select name: ${selectName}`;
        this.debugInfo += `\n- Selected ID: ${selectedId}`;
        this.debugInfo += `\n- Details div ID: ${detailsDivId}`;

        const detailsDiv = this.formContainer.nativeElement.querySelector(`#${detailsDivId}`);

        if (!detailsDiv) {
            this.debugInfo += `\nDetails container not found for reference select: ${selectName}`;
            console.warn(`Details container not found for reference select: ${selectName}`);
            return;
        }

        // Clear details if no reference is selected or data is missing
        if (!selectedId || !this.referenceDataMap[selectName]) {
            this.debugInfo += `\nNo data available for reference ${selectName}`;
            detailsDiv.innerHTML = '';
            return;
        }

        const references = this.referenceDataMap[selectName];
        this.debugInfo += `\nAvailable references: ${JSON.stringify(references)}`;

        const selectedReference = references.find(r => r.id === selectedId);

        if (selectedReference) {
            this.debugInfo += `\nFound reference data: ${JSON.stringify(selectedReference)}`;

            // Format details based on the reference data
            let detailsHtml = '<div class="reference-details-content">';

            // Add all non-empty fields from the reference data
            Object.entries(selectedReference.data || {}).forEach(([key, value]) => {
                if (value) {
                    const label = key.charAt(0).toUpperCase() + key.slice(1);
                    detailsHtml += `<div class="detail-line"><span class="detail-label">${label}:</span> ${value}</div>`;
                    this.debugInfo += `\nAdded detail: ${label} = ${value}`;
                }
            });

            detailsHtml += '</div>';

            // Use sanitizer for safety
            detailsDiv.innerHTML = detailsHtml;
            this.debugInfo += `\nUpdated reference details HTML`;
        } else {
            this.debugInfo += `\nNo matching reference found for ID ${selectedId}`;
            detailsDiv.innerHTML = '';
        }

        this.debugInfo += '\n=== End updating reference details ===\n';
    }

    private formatReferenceDisplay(pattern: string, record: any): string {
        this.debugInfo += `\nFormatting reference display:`;
        this.debugInfo += `\n- Pattern: ${pattern}`;
        this.debugInfo += `\n- Record: ${JSON.stringify(record)}`;

        const result = pattern.replace(/\{([^}]+)\}/g, (match, field) => {
            // First check if it's a root level property
            if (field === 'documentNumber') {
                const value = record.documentNumber || '';
                this.debugInfo += `\n- Replacing ${match} with root property ${value}`;
                return value;
            }

            // Then check in the data object
            const value = record.data?.[field] || '';
            this.debugInfo += `\n- Replacing ${match} with data property ${value}`;
            return value;
        });

        this.debugInfo += `\n- Result: ${result}`;
        return result;
    }

    ngOnInit(): void {
        // Initialize dynamic form controls after view is initialized
        setTimeout(() => {
            this.initializeFormControls();
            this.loadReferenceData();
            // Trigger initial details update for selects in edit mode
            if (this.data.mode === 'edit' && this.data.record) {
                this.updateInitialPartnerDetails();
            }

            // Focus logic
            const docNumberInput = document.getElementById('doc-number');
            if (docNumberInput) {
                docNumberInput.focus();
            }

            // Generate colors for existing tags
            this.tags.forEach(tag => {
                if (!this.tagColors[tag]) {
                    this.tagColors[tag] = this.generatePastelColor();
                }
            });
        });

        // Initialize subitems from the record if in edit mode
        this.initializeSubitems();

        // Initialize empty arrays for each subitem definition if not present
        if (this.data.evidence.subitemDefinitions) {
            this.data.evidence.subitemDefinitions.forEach(def => {
                if (!this.subitems[def.fieldName]) {
                    this.subitems[def.fieldName] = [];
                }
            });
        }
    }

    private initializeFormControls(): void {
        const formControls: { [key: string]: any } = {};
        const formContainer = this.formContainer.nativeElement;

        if (!formContainer) {
            this.debugInfo += '\nForm container not found';
            return;
        }

        const inputs = formContainer.querySelectorAll('input, select, textarea');
        this.debugInfo += `\nFound ${inputs.length} input elements`;

        inputs.forEach((input: Element) => {
            const htmlInput = input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
            const name = htmlInput.getAttribute('name') || htmlInput.id;
            this.debugInfo += `\nProcessing input: ${name}`;

            if (!name) {
                console.warn('Input element is missing name and id', htmlInput);
                return;
            }

            // Initialize control with value from record in edit mode, otherwise empty string
            let initialValue = '';
            if (this.data.mode === 'edit' && this.data.record?.data[name]) {
                const value = this.data.record.data[name];
                if (htmlInput.getAttribute('data-gjs-type') === 'reference-select') {
                    // For reference fields, use the ID or the value itself
                    initialValue = typeof value === 'object' ? value.id : value;
                } else {
                    initialValue = value;
                }
            }
            formControls[name] = [initialValue];

            // Add event listener for input/change
            htmlInput.addEventListener('input', (e) => {
                const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
                let value: string | boolean = target.value;
                if (target.type === 'checkbox' && target instanceof HTMLInputElement) {
                    value = target.checked;
                }
                this.recordForm.patchValue({ [name]: value });

                // If it's a select with partner data, update details
                if (target.tagName === 'SELECT' && this.partnerDataMap[name]) {
                    this.updatePartnerDetails(target as HTMLSelectElement);
                }

                // If it's a reference select, update reference details
                if (target.tagName === 'SELECT' && target.getAttribute('data-gjs-type') === 'reference-select') {
                    this.updateReferenceDetails(target as HTMLSelectElement);
                }

                // Apply form rules after value changes
                this.applyFormRules();
            });

            // Set initial displayed value for edit mode
            if (this.data.mode === 'edit' && this.data.record) {
                const value = this.data.record.data[name];
                if (htmlInput.type === 'checkbox' && htmlInput instanceof HTMLInputElement) {
                    htmlInput.checked = !!value;
                } else if (htmlInput.tagName === 'SELECT') {
                    if (htmlInput.getAttribute('data-gjs-type') === 'reference-select') {
                        // For reference fields, use the ID or the value itself
                        htmlInput.value = typeof value === 'object' ? value.id : (value || '');
                    } else {
                        htmlInput.value = value || '';
                    }
                } else {
                    htmlInput.value = value || '';
                }
            }
        });

        this.recordForm = this.fb.group(formControls);

        // Apply initial form rules
        this.applyFormRules();
    }

    private updateInitialPartnerDetails(): void {
        const formContainer = this.formContainer.nativeElement;
        if (!formContainer) return;

        const selects = formContainer.querySelectorAll('select');
        selects.forEach((select: HTMLSelectElement) => {
            const name = select.name;
            if (name && this.partnerDataMap[name] && select.value) {
                 this.updatePartnerDetails(select);
            }
        });
    }

    private loadTagSuggestions(): void {
        const savedTags = localStorage.getItem('erp-tags');
        if (savedTags) {
            try {
                this.tagSuggestions = JSON.parse(savedTags);

                // Load saved colors
                const savedColors = localStorage.getItem('erp-tag-colors');
                if (savedColors) {
                    this.tagColors = JSON.parse(savedColors);
                }
            } catch (e) {
                console.error('Failed to parse saved tags:', e);
                this.tagSuggestions = [];
            }
        } else {
            this.tagSuggestions = [];
        }
    }

    private saveTagSuggestions(): void {
        // Save unique tags to localStorage
        const uniqueTags = Array.from(new Set([...this.tagSuggestions, ...this.tags]));
        localStorage.setItem('erp-tags', JSON.stringify(uniqueTags));

        // Save tag colors
        localStorage.setItem('erp-tag-colors', JSON.stringify(this.tagColors));
    }

    filterSuggestions(): void {
        const searchTerm = this.newTag.toLowerCase().trim();
        if (!searchTerm) {
            this.filteredSuggestions = [];
            return;
        }

        this.filteredSuggestions = this.tagSuggestions
            .filter(tag => tag.toLowerCase().includes(searchTerm) && !this.tags.includes(tag))
            .slice(0, 5); // Limit to 5 suggestions
    }

    selectSuggestion(tag: string): void {
        this.newTag = '';
        this.addSpecificTag(tag);
        setTimeout(() => this.tagInput.nativeElement.focus(), 0);
    }

    handleTagBlur(): void {
        // Add tag on blur after a short delay to allow for suggestion clicks
        setTimeout(() => {
            if (this.newTag.trim()) {
                this.addTag();
            }
            this.filteredSuggestions = [];
        }, 200);
    }

    addTag(): void {
        const tagToAdd = this.newTag.trim();
        this.addSpecificTag(tagToAdd);
    }

    addSpecificTag(tagToAdd: string): void {
        if (tagToAdd && !this.tags.includes(tagToAdd)) {
            // Add to current tags
            this.tags.push(tagToAdd);

            // Generate color if not exists
            if (!this.tagColors[tagToAdd]) {
                this.tagColors[tagToAdd] = this.generatePastelColor();
            }

            // Add to suggestions if not exists
            if (!this.tagSuggestions.includes(tagToAdd)) {
                this.tagSuggestions.push(tagToAdd);
                this.saveTagSuggestions();
            }
        }
        this.newTag = ''; // Clear input
        this.filteredSuggestions = [];
    }

    removeTag(index: number): void {
        if (index >= 0 && index < this.tags.length) {
            this.tags.splice(index, 1);
        }
    }

    getTagColor(tag: string, opacity: number = 1): string {
        if (!this.tagColors[tag]) {
            this.tagColors[tag] = this.generatePastelColor();
            this.saveTagSuggestions();
        }

        if (opacity < 1) {
            // Convert hex to rgba with opacity
            const hex = this.tagColors[tag].replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }

        return this.tagColors[tag];
    }

    generatePastelColor(): string {
        // Generate pastel colors by using high lightness values
        const hue = Math.floor(Math.random() * 360); // 0-359 degrees
        const saturation = 65 + Math.floor(Math.random() * 25); // 65-90%
        const lightness = 65 + Math.floor(Math.random() * 15); // 65-80%

        // Convert HSL to HEX
        return this.hslToHex(hue, saturation, lightness);
    }

    private hslToHex(h: number, s: number, l: number): string {
        s /= 100;
        l /= 100;

        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;

        let r = 0, g = 0, b = 0;

        if (0 <= h && h < 60) {
            r = c; g = x; b = 0;
        } else if (60 <= h && h < 120) {
            r = x; g = c; b = 0;
        } else if (120 <= h && h < 180) {
            r = 0; g = c; b = x;
        } else if (180 <= h && h < 240) {
            r = 0; g = x; b = c;
        } else if (240 <= h && h < 300) {
            r = x; g = 0; b = c;
        } else if (300 <= h && h < 360) {
            r = c; g = 0; b = x;
        }

        const toHex = (rgb: number) => {
            const hex = Math.round((rgb + m) * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };

        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    cancel(): void {
        this.dialogRef.close();
    }

    save(): void {
        // Ensure dynamic form controls are valid if needed
        // Currently, recordForm might be empty if no dynamic fields exist
        // Add validation logic here if required

        // Save tags to local storage before closing
        this.saveTagSuggestions();

        // Get form values and prepare record data
        const formData = this.extractFormValues();

        // Create or update record
        const record: EvidenceRecord = this.data.mode === 'edit' && this.data.record
            ? {
                ...this.data.record,
                documentNumber: this.documentNumber,
                tags: [...this.tags],
                data: formData,
                subitems: this.subitems, // Add subitems to the record
                updatedAt: new Date()
              }
            : {
                id: crypto.randomUUID(),
                evidenceId: this.data.evidence.id,
                documentNumber: this.documentNumber,
                tags: [...this.tags],
                data: formData,
                subitems: this.subitems, // Add subitems to the record
                createdAt: new Date(),
                updatedAt: new Date()
              };

        // Close dialog with the complete record
        this.dialogRef.close(record);
    }

    // Update extractFormValues method to add logging:
    private extractFormValues(): any {
        // Extract form values
        const formValues: { [key: string]: any } = {};
        this.debugInfo += '\nExtracting form values';

        // Get all form fields
        const formElements = this.formContainer.nativeElement.querySelectorAll('input, select, textarea');
        formElements.forEach((element: any) => {
            if (element.name) {
                if (element.type === 'checkbox') {
                    formValues[element.name] = element.checked;
                } else if (element.type === 'number') {
                    formValues[element.name] = element.value !== '' ? Number(element.value) : null;
                } else if (element.getAttribute('data-gjs-type') === 'reference-select') {
                    // For reference fields, store both the ID and the display value
                    const selectedId = element.value;
                    this.debugInfo += `\nProcessing reference field ${element.name}, selected ID: ${selectedId}`;

                    if (selectedId && this.referenceDataMap[element.name]) {
                        const selectedReference = this.referenceDataMap[element.name].find(r => r.id === selectedId);
                        if (selectedReference) {
                            const displayPattern = element.getAttribute('data-display-pattern') || '';
                            const display = this.formatReferenceDisplay(displayPattern, selectedReference);

                            formValues[element.name] = {
                                id: selectedId,
                                display,
                                data: selectedReference.data
                            };
                            this.debugInfo += `\nStored reference value for ${element.name}: ${JSON.stringify(formValues[element.name])}`;
                        } else {
                            this.debugInfo += `\nNo matching reference found for ID ${selectedId}`;
                            formValues[element.name] = null;
                        }
                    } else {
                        this.debugInfo += `\nNo reference data available for ${element.name}`;
                        formValues[element.name] = null;
                    }
                } else {
                    formValues[element.name] = element.value;
                }
            }
        });

        this.debugInfo += `\nExtracted form values: ${JSON.stringify(formValues)}`;
        return formValues;
    }

    // Get the rows for a specific subitem grid
    getSubitemRows(fieldName: string): SubitemRecord[] {
        return this.subitems[fieldName] || [];
    }

    // Get column definitions for a subitem grid
    getSubitemColumnDefs(subitemDef: SubitemDefinition): any[] {
        const columnDefs = [...subitemDef.columns.map(col => ({
            field: `data.${col.field}`,
            headerName: col.headerName,
            sortable: true,
            filter: true,
            width: col.width
        }))];

        // Add action buttons column
        columnDefs.push({
            headerName: 'Akcie',
            field: 'id',
            width: 120,
            cellRenderer: (params: any) => {
                const container = document.createElement('div');
                container.classList.add('d-flex', 'gap-2');

                // Edit button
                const editBtn = document.createElement('button');
                editBtn.classList.add('btn', 'btn-sm', 'btn-outline-primary');
                editBtn.innerHTML = '<i class="bi bi-pencil"></i>';
                editBtn.title = 'Upraviť';
                editBtn.addEventListener('click', () => this.editSubitem(subitemDef, params.data));

                // Delete button
                const deleteBtn = document.createElement('button');
                deleteBtn.classList.add('btn', 'btn-sm', 'btn-outline-danger');
                deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
                deleteBtn.title = 'Vymazať';
                deleteBtn.addEventListener('click', () => this.deleteSubitem(subitemDef.fieldName, params.data.id));

                container.appendChild(editBtn);
                container.appendChild(deleteBtn);

                return container;
            }
        } as any); // Cast to any to avoid TypeScript error

        return columnDefs;
    }

    // Add a new subitem
    addSubitem(subitemDef: SubitemDefinition): void {
        const isMobile = window.innerWidth <= 768;
        const dialogConfig = {
            data: {
                subitemDefinition: subitemDef,
                parentRecordId: this.data.record?.id || 'temp',
                mode: 'create'
            },
            width: isMobile ? '100%' : '600px',
            ...(isMobile && {
                maxWidth: '100vw',
                height: '100%',
                panelClass: 'fullscreen-dialog'
            })
        };

        const dialogRef = this.dialog.open(SubitemEditorDialogComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                if (!this.subitems[subitemDef.fieldName]) {
                    this.subitems[subitemDef.fieldName] = [];
                }
                this.subitems[subitemDef.fieldName].push(result);

                // Process calculated fields if any
                this.processCalculatedFields(subitemDef);
            }
        });
    }

    // Edit an existing subitem
    editSubitem(subitemDef: SubitemDefinition, record: SubitemRecord): void {
        const isMobile = window.innerWidth <= 768;
        const dialogConfig = {
            data: {
                subitemDefinition: subitemDef,
                record: record,
                parentRecordId: this.data.record?.id || 'temp',
                mode: 'edit'
            },
            width: isMobile ? '100%' : '600px',
            ...(isMobile && {
                maxWidth: '100vw',
                height: '100%',
                panelClass: 'fullscreen-dialog'
            })
        };

        const dialogRef = this.dialog.open(SubitemEditorDialogComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                // Find and replace the updated record
                const index = this.subitems[subitemDef.fieldName].findIndex(item => item.id === result.id);
                if (index !== -1) {
                    this.subitems[subitemDef.fieldName][index] = result;
                    // Process calculated fields
                    this.processCalculatedFields(subitemDef);
                }
            }
        });
    }

    // Delete a subitem
    deleteSubitem(fieldName: string, recordId: string): void {
        if (confirm('Naozaj chcete odstrániť túto položku?')) {
            const index = this.subitems[fieldName].findIndex(item => item.id === recordId);
            if (index !== -1) {
                this.subitems[fieldName].splice(index, 1);
                // Create a new array to trigger change detection
                this.subitems[fieldName] = [...this.subitems[fieldName]];
            }
        }
    }

    private initializeSubitems(): void {
        // Initialize subitems if in edit mode
        if (this.data.mode === 'edit' && this.data.record?.subitems) {
            this.subitems = { ...this.data.record.subitems };

            // Process calculated fields for each subitem type
            this.processCalculatedFieldsForAllSubitems();
        }
    }

    /**
     * Process all calculated fields for all subitem types
     */
    private processCalculatedFieldsForAllSubitems(): void {
        if (!this.data.evidence.subitemDefinitions) return;

        this.data.evidence.subitemDefinitions.forEach(subitemDef => {
            const fieldName = subitemDef.fieldName;
            const records = this.subitems[fieldName];

            if (records && records.length > 0) {
                // Check if this subitem definition has any calculated fields
                const hasCalculatedFields = subitemDef.columns.some(col => col.isCalculated && col.formula);

                if (hasCalculatedFields) {
                    // Use the service to process calculated fields
                    this.subitems[fieldName] = this.evidenceService.processCalculatedFields(
                        records,
                        subitemDef.columns
                    );
                }
            }
        });
    }

    /**
     * Process calculated fields for a specific subitem definition
     */
    private processCalculatedFields(subitemDef: SubitemDefinition): void {
        const fieldName = subitemDef.fieldName;
        const hasCalculatedFields = subitemDef.columns.some(col => col.isCalculated && col.formula);

        if (hasCalculatedFields && this.subitems[fieldName] && this.subitems[fieldName].length > 0) {
            // Use the service to process calculated fields
            this.subitems[fieldName] = this.evidenceService.processCalculatedFields(
                this.subitems[fieldName],
                subitemDef.columns
            );

            // Create a new array reference to trigger change detection in ag-grid
            this.subitems[fieldName] = [...this.subitems[fieldName]];
        }
    }

    /**
     * Applies form rules based on current form values
     */
    private applyFormRules(): void {
        if (!this.data.evidence.formRules || !this.formContainer) return;

        const activeRules = this.data.evidence.formRules.filter(rule => rule.active);
        if (activeRules.length === 0) return;

        const formElements = this.formContainer.nativeElement.querySelectorAll('input, select, textarea');
        const fields: { [key: string]: HTMLElement } = {};

        // Build fields map
        formElements.forEach((element: HTMLElement) => {
            const name = element.getAttribute('name');
            if (name) {
                fields[name] = element;
            }
        });

        // Evaluate and apply each rule
        activeRules.forEach(rule => {
            // Skip if no conditions (except for calculation rules)
            if (rule.conditions.length === 0 && !rule.actions.some(a => a.type === 'calculate')) {
                return;
            }

            // For calculation rules with no conditions, always apply
            if (rule.conditions.length === 0 && rule.actions.some(a => a.type === 'calculate')) {
                this.applyRuleActions(rule, fields);
                return;
            }

            // Check if all conditions are met
            const conditionsMet = rule.conditions.every(condition =>
                this.evaluateCondition(condition, fields)
            );

            if (conditionsMet) {
                this.applyRuleActions(rule, fields);
            } else {
                this.revertRuleActions(rule, fields);
            }
        });
    }

    /**
     * Evaluates a single form rule condition
     */
    private evaluateCondition(condition: RuleCondition, fields: { [key: string]: HTMLElement }): boolean {
        const field = fields[condition.fieldName];
        if (!field) return false;

        const element = field as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        let fieldValue: string | number | boolean = element.type === 'checkbox' ?
            (element as HTMLInputElement).checked :
            element.value || '';  // Default to empty string if undefined
        let testValue = condition.value || '';  // Default to empty string if undefined

        // Type conversion for numeric comparisons
        if (condition.operator === 'greaterThan' || condition.operator === 'lessThan') {
            fieldValue = Number(fieldValue);
            testValue = Number(testValue);

            if (isNaN(fieldValue) || isNaN(testValue)) {
                return false;
            }
        }

        switch (condition.operator) {
            case 'equals':
                return String(fieldValue) === String(testValue);
            case 'notEquals':
                return String(fieldValue) !== String(testValue);
            case 'contains':
                return String(fieldValue).includes(String(testValue));
            case 'notContains':
                return !String(fieldValue).includes(String(testValue));
            case 'greaterThan':
                return typeof fieldValue === 'number' && typeof testValue === 'number' && fieldValue > testValue;
            case 'lessThan':
                return typeof fieldValue === 'number' && typeof testValue === 'number' && fieldValue < testValue;
            case 'isEmpty':
                return !fieldValue;
            case 'isNotEmpty':
                return !!fieldValue;
            default:
                return false;
        }
    }

    /**
     * Applies the actions for a rule
     */
    private applyRuleActions(rule: FormRule, fields: { [key: string]: HTMLElement }): void {
        rule.actions.forEach(action => {
            const targetField = fields[action.targetField];
            if (!targetField) return;

            const element = targetField as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
            const container = this.getFieldContainer(targetField);

            switch (action.type) {
                case 'enable':
                    element.disabled = false;
                    break;
                case 'disable':
                    element.disabled = true;
                    break;
                case 'show':
                    if (container) container.style.display = '';
                    break;
                case 'hide':
                    if (container) container.style.display = 'none';
                    break;
                case 'setValue':
                    if (element.type === 'checkbox') {
                        // For checkboxes, convert value to boolean
                        const boolValue = typeof action.value === 'boolean' ? action.value :
                            typeof action.value === 'number' ? action.value === 1 :
                            typeof action.value === 'string' ? action.value.toLowerCase() === 'true' : false;
                        (element as HTMLInputElement).checked = boolValue;
                    } else if (element.type === 'number') {
                        // For number inputs, ensure we have a valid number or empty string
                        const numValue = action.value === undefined || action.value === '' ? '' : String(Number(action.value));
                        element.value = numValue;
                    } else {
                        // For all other inputs, convert to string
                        element.value = action.value !== undefined ? String(action.value) : '';
                    }
                    // Trigger change event
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                    break;
                case 'calculate':
                    if (action.formula) {
                        const result = this.calculateFormula(action.formula, fields);
                        if (result !== null) {
                            element.value = String(result);
                            // Trigger change event
                            element.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    }
                    break;
            }
        });
    }

    /**
     * Reverts the actions for a rule
     */
    private revertRuleActions(rule: FormRule, fields: { [key: string]: HTMLElement }): void {
        rule.actions.forEach(action => {
            const targetField = fields[action.targetField];
            if (!targetField) return;

            const element = targetField as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
            const container = this.getFieldContainer(targetField);

            switch (action.type) {
                case 'enable':
                    element.disabled = true;
                    break;
                case 'disable':
                    element.disabled = false;
                    break;
                case 'show':
                    if (container) container.style.display = 'none';
                    break;
                case 'hide':
                    if (container) container.style.display = '';
                    break;
                // For setValue and calculate, we don't revert automatically
            }
        });
    }

    /**
     * Calculates formula result
     */
    private calculateFormula(formula: string, fields: { [key: string]: HTMLElement }): number | null {
        try {
            // Replace field names with values
            let expression = formula;

            // Find all potential field names in the formula
            const fieldRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
            const fieldMatches = formula.match(fieldRegex) || [];

            // Replace field names with their values
            fieldMatches.forEach(fieldName => {
                if (fields[fieldName]) {
                    const element = fields[fieldName] as HTMLInputElement | HTMLSelectElement;
                    const value = element.type === 'checkbox' ?
                        (element as HTMLInputElement).checked :
                        element.value;
                    // Use numeric value or 0 if empty/NaN
                    const numValue = value === '' ? 0 : Number(value);
                    if (!isNaN(numValue)) {
                        expression = expression.replace(new RegExp('\\b' + fieldName + '\\b', 'g'), String(numValue));
                    }
                }
            });

            // Evaluate the expression
            // eslint-disable-next-line no-new-func
            const result = Function('"use strict"; return (' + expression + ')')();

            // Format the result if needed
            return typeof result === 'number' ? Math.round(result * 100) / 100 : null;
        } catch (e) {
            console.error('Error evaluating formula:', e);
            return null;
        }
    }

    /**
     * Gets the container element for a form field
     */
    private getFieldContainer(field: HTMLElement): HTMLElement | null {
        let elem: HTMLElement | null = field;
        while (elem && !elem.classList.contains('mb-3') && !elem.classList.contains('form-check') && elem !== document.body) {
            elem = elem.parentElement;
        }
        return elem;
    }

    // Add new method to load reference data
    private loadReferenceData(): void {
        this.debugInfo += '\nStarting to load reference data...';
        const formContainer = this.formContainer.nativeElement;
        if (!formContainer) {
            this.debugInfo += '\nForm container not found';
            return;
        }

        // Log all select elements and their attributes for debugging
        const allSelects = formContainer.querySelectorAll('select');
        this.debugInfo += `\nFound ${allSelects.length} total select elements`;
        allSelects.forEach((select: HTMLSelectElement) => {
            this.debugInfo += `\nSelect element: ${select.name}`;
            this.debugInfo += `\n- data-gjs-type: ${select.getAttribute('data-gjs-type')}`;
            this.debugInfo += `\n- data-target-evidence: ${select.getAttribute('data-target-evidence')}`;
            this.debugInfo += `\n- data-display-pattern: ${select.getAttribute('data-display-pattern')}`;
        });

        const referenceSelects = formContainer.querySelectorAll('select[data-gjs-type="reference-select"]');
        this.debugInfo += `\nFound ${referenceSelects.length} reference-select elements`;

        referenceSelects.forEach((select: HTMLSelectElement) => {
            const targetEvidenceId = select.getAttribute('data-target-evidence');
            const displayPattern = select.getAttribute('data-display-pattern');
            const selectName = select.name;

            this.debugInfo += `\nProcessing reference-select: ${selectName}`;
            this.debugInfo += `\n- Target Evidence ID: ${targetEvidenceId}`;
            this.debugInfo += `\n- Display Pattern: ${displayPattern}`;

            if (targetEvidenceId && displayPattern) {
                this.debugInfo += '\nCalling evidenceService.getRecords...';
                this.evidenceService.getRecords(targetEvidenceId).subscribe({
                    next: (records) => {
                        this.debugInfo += `\nReceived ${records.length} records for ${selectName}`;
                        this.referenceDataMap[selectName] = records;

                        // Update select options
                        select.innerHTML = '<option value="">Select reference...</option>';
                        records.forEach(record => {
                            const option = document.createElement('option');
                            option.value = record.id;
                            const displayText = this.formatReferenceDisplay(displayPattern, record);
                            option.textContent = displayText;
                            this.debugInfo += `\nAdding option: ${displayText} (${record.id})`;
                            select.appendChild(option);
                        });

                        // Set initial value if in edit mode
                        if (this.data.mode === 'edit' && this.data.record?.data[selectName]) {
                            const referenceValue = this.data.record.data[selectName];
                            this.debugInfo += `\nSetting initial value for ${selectName}: ${JSON.stringify(referenceValue)}`;

                            if (typeof referenceValue === 'object' && referenceValue.id) {
                                select.value = referenceValue.id;
                                this.debugInfo += `\nSet value to ${referenceValue.id}`;
                            } else {
                                select.value = referenceValue || '';
                                this.debugInfo += `\nSet value to ${referenceValue}`;
                            }
                            this.updateReferenceDetails(select);
                        }
                    },
                    error: (error) => {
                        this.debugInfo += `\nError loading reference data for ${selectName}: ${error}`;
                        console.error('Error loading reference data:', error);
                    }
                });
            } else {
                this.debugInfo += `\nMissing required attributes for ${selectName}`;
            }
        });
    }
}
