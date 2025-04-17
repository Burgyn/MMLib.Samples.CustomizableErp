import { Component, Inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Evidence, EvidenceRecord } from '../../models/evidence.model';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
    selector: 'app-record-editor-dialog',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatDialogModule, FormsModule],
    template: `
        <div class="record-editor-dialog" role="dialog" aria-labelledby="dialog-title">
            <div class="dialog-header">
                <!-- Title -->
                <h2 mat-dialog-title id="dialog-title" class="mb-3">{{ data.evidence.name }}</h2>

                <!-- Document Number -->
                <div class="mb-3 row align-items-center form-group-sm">
                    <label for="doc-number" class="col-sm-2 col-form-label">Číslo</label>
                    <div class="col-sm-10">
                        <input type="text" id="doc-number" class="form-control" [(ngModel)]="documentNumber" placeholder="Zadajte číslo záznamu...">
                    </div>
                </div>

                <!-- Tags -->
                <div class="mb-3 row align-items-center form-group-sm">
                    <label class="col-sm-2 col-form-label">Tagy</label>
                    <div class="col-sm-10 tags-section">
                        <span *ngFor="let tag of tags; let i = index" class="tag-badge badge me-1">
                            {{ tag }}
                            <button type="button" class="btn-close btn-close-white" aria-label="Remove tag" (click)="removeTag(i)"></button>
                        </span>
                        <div class="add-tag-wrapper d-inline-block">
                            <input type="text" class="form-control form-control-sm add-tag-input" [(ngModel)]="newTag" placeholder="Pridať tag..." (keyup.enter)="addTag()">
                            <button type="button" class="btn btn-sm btn-outline-secondary add-tag-btn" (click)="addTag()" title="Pridať tag">+</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main Content Panel -->
            <div mat-dialog-content class="dialog-content p-0">
                <div class="content-panel">
                    <form [formGroup]="recordForm" class="form-container p-0" #formContainer>
                        <div [innerHTML]="formHtml" class="form-fields"></div>
                        <div class="debug-section mt-3" *ngIf="showDebug">
                            <pre class="debug-info">{{ debugInfo }}</pre>
                        </div>
                    </form>
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
        :host {
            display: block;
            /* Ensures the dialog container takes up space */
        }
        .record-editor-dialog {
            /* Increased size, adjust as needed */
            min-width: 600px;
            max-width: 900px;
            width: 80vw; /* Use viewport width */
            background: #f8f9fa; /* Light grey background for the whole dialog */
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            max-height: 90vh; /* Limit height */
            overflow: hidden; /* Prevent scrollbars on the dialog itself */
        }
        .dialog-header {
            padding: 20px 20px 0 20px; /* Padding top/sides, no bottom */
            background: #f8f9fa; /* Ensure header background */
        }
        .dialog-header .form-group-sm .col-form-label {
            font-size: 0.875rem; /* Smaller labels in header */
            font-weight: 500;
        }
        .dialog-content {
            flex-grow: 1; /* Allow content to take available space */
            overflow-y: auto; /* Enable scrolling ONLY for the content panel */
            padding: 20px; /* Padding around the white panel */
            padding-top: 10px;
        }
        .form-container {
            padding: 0; /* Removed padding, now in content-panel */
        }
        .form-fields {
            /* Styles removed previously to allow GrapesJS layout */
        }
        .form-fields input,
        .form-fields select,
        .form-fields textarea {
            width: 100%;
            padding: 0.375rem 0.75rem;
            font-size: 1rem;
            font-weight: 400;
            line-height: 1.5;
            color: #212529;
            background-color: #fff;
            border: 1px solid #ced4da;
            border-radius: 0.25rem;
            transition: border-color .15s ease-in-out,box-shadow .15s ease-in-out;
        }
        .dialog-actions {
            padding: 15px 20px;
            border-top: 1px solid #dee2e6;
            background: #f8f9fa; /* Match header background */
            display: flex;
            align-items: center;
            flex-shrink: 0; /* Prevent footer shrinking */
        }
        .debug-section {
            border-top: 1px solid #dee2e6;
            padding-top: 1rem;
            margin-top: 1.5rem;
        }
        .debug-info {
            font-size: 12px;
            background: #f0f0f0; /* Slightly different debug background */
            padding: 1rem;
            border-radius: 4px;
            white-space: pre-wrap;
            word-break: break-word;
            max-height: 300px;
            overflow: auto;
        }
        .content-panel {
            background-color: #fff; /* White background for the form area */
            padding: 1.5rem;
            border: 1px solid #dee2e6;
            border-radius: 0.375rem;
            box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
            height: 100%; /* Make panel fill the scrollable area */
            overflow-y: auto; /* Allow scrolling within the panel if needed */
        }
        .tags-section {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 0.25rem; /* Gap between tags and input */
        }
        .tag-badge {
            font-size: 0.8em;
            padding: 0.4em 0.6em;
            display: inline-flex;
            align-items: center;
            background-color: #6c757d; /* Bootstrap secondary */
            color: white;
        }
        .tag-badge .btn-close {
            margin-left: 0.5em;
            width: 0.5em;
            height: 0.5em;
            filter: brightness(0) invert(1); /* Make close button white */
        }
        .add-tag-wrapper {
            position: relative;
            display: inline-flex;
            align-items: center;
        }
        .add-tag-input {
            min-width: 100px;
            width: auto;
            padding-right: 30px; /* Space for the button */
            display: inline-block;
        }
        .add-tag-btn {
            position: absolute;
            right: 3px;
            top: 50%;
            transform: translateY(-50%);
            height: calc(100% - 6px); /* Adjust height */
            width: 25px;
            padding: 0;
            line-height: 1;
            border: none;
            background: none;
            font-size: 1.2rem;
        }
    `]
})
export class RecordEditorDialogComponent implements OnInit {
    @ViewChild('formContainer') formContainer!: ElementRef;
    @ViewChild('cancelButton') cancelButton!: ElementRef;
    @ViewChild('saveButton') saveButton!: ElementRef;

    recordForm: FormGroup;
    formHtml: SafeHtml;
    debugInfo: string = '';
    showDebug: boolean = false;

    // Properties for document number and tags
    documentNumber: string = '';
    tags: string[] = [];
    newTag: string = '';

    constructor(
        private fb: FormBuilder,
        private sanitizer: DomSanitizer,
        private dialogRef: MatDialogRef<RecordEditorDialogComponent>,
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

                // Add classes if any
                let classes = '';
                if (comp.classes) {
                    classes = comp.classes.map((c: any) => typeof c === 'string' ? c : c.name).join(' ');
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

    ngOnInit(): void {
        // Initialize dynamic form controls after view is initialized
        setTimeout(() => {
            this.initializeFormControls();
            // Focus logic can be refined, maybe focus doc number first?
            const firstInput = this.formContainer.nativeElement.querySelector('input, select, textarea');
            if (firstInput) {
                // firstInput.focus();
            }
            const docNumberInput = document.getElementById('doc-number');
            if (docNumberInput) {
                docNumberInput.focus();
            }
        });
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

            // Initialize control
            formControls[name] = [this.data.mode === 'edit' && this.data.record?.data[name] ? this.data.record.data[name] : ''];

            // Update form value on input change
            htmlInput.addEventListener('input', (e) => {
                const target = e.target as HTMLInputElement;
                let value: string | boolean = target.value;
                if (target.type === 'checkbox') {
                    value = target.checked;
                }
                this.recordForm.patchValue({ [name]: value });
            });

            // Set initial value for edit mode (redundant due to initialization above, but safe)
            if (this.data.mode === 'edit' && this.data.record) {
                const value = this.data.record.data[name];
                if (htmlInput.type === 'checkbox') {
                    (htmlInput as HTMLInputElement).checked = !!value;
                } else {
                    htmlInput.value = value || '';
                }
            }
        });

        this.recordForm = this.fb.group(formControls);

        // Initial patch for edit mode (safer)
        // if (this.data.mode === 'edit' && this.data.record) {
        //     this.recordForm.patchValue(this.data.record.data);
        // }
    }

    addTag(): void {
        const tagToAdd = this.newTag.trim();
        if (tagToAdd && !this.tags.includes(tagToAdd)) {
            this.tags.push(tagToAdd);
        }
        this.newTag = ''; // Clear input
    }

    removeTag(index: number): void {
        if (index >= 0 && index < this.tags.length) {
            this.tags.splice(index, 1);
        }
    }

    cancel(): void {
        this.dialogRef.close();
    }

    save(): void {
        // Ensure dynamic form controls are valid if needed
        // Currently, recordForm might be empty if no dynamic fields exist
        // Add validation logic here if required

        const record: Partial<EvidenceRecord> = {
            id: this.data.record?.id,
            evidenceId: this.data.evidence.id,
            documentNumber: this.documentNumber,
            tags: this.tags,
            data: this.recordForm.value, // Save data from dynamic fields
            createdAt: this.data.record?.createdAt || new Date(),
            updatedAt: new Date()
        };
        this.dialogRef.close(record);
    }
}
