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
            <div mat-dialog-content>
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
            min-width: 600px;
            width: 80vw;
            background: #fff;
            border-radius: 0.375rem;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            height: 100%;
            border: 1px solid #dee2e6;
            box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
        }
        .dialog-header {
            padding: 1rem 1.5rem;
            background: #fff;
            flex-shrink: 0;
            border-bottom: 1px solid #e9ecef;
        }
        /* More specific label styling - closer to Faktura */
        .record-editor-dialog .dialog-header .form-label,
        .record-editor-dialog .content-panel .form-label,
        .record-editor-dialog .form-fields label {
            font-size: 0.875rem; /* Consistent label size */
            font-weight: 500; /* Medium weight */
            color: #6c757d; /* Grey color */
            margin-bottom: 0.5rem; /* Standard Bootstrap label margin */
            display: block;
        }
        .record-editor-dialog .dialog-header .form-control,
        .record-editor-dialog .dialog-header .add-tag-input {
            background-color: #fff;
            border-radius: 0.25rem;
            border: 1px solid #ced4da;
            font-family: inherit; /* Inherit font */
            font-size: 1rem; /* Standard font size */
            padding: 0.375rem 0.75rem; /* Standard padding */
        }
        .mat-mdc-dialog-content {
            flex-grow: 1;
            overflow-y: auto;
            padding: 1.5rem;
            background-color: #f8f9fa;
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
            color: #212529;
            background-color: #fff;
            border: 1px solid #ced4da;
            border-radius: 0.25rem;
            transition: border-color .15s ease-in-out, box-shadow .15s ease-in-out;
            margin-bottom: 1.5rem; /* Increased spacing below field */
            font-family: inherit;
        }
        .record-editor-dialog .form-fields .form-control:focus,
        .record-editor-dialog .form-fields input:focus,
        .record-editor-dialog .form-fields select:focus,
        .record-editor-dialog .form-fields textarea:focus {
            border-color: #86b7fe;
            box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
            outline: 0;
        }
        /* Override GrapesJS block margin if needed, but prefer margin on inputs */
        .record-editor-dialog .form-fields .mb-3 {
            /* margin-bottom: 1.5rem !important; */ /* Maybe not needed if inputs have margin */
        }
        .dialog-actions {
            padding: 1rem 1.5rem;
            border-top: 1px solid #e9ecef;
            background: #fff;
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
            background-color: #0d6efd;
            border-color: #0d6efd;
        }
        .dialog-actions .btn-secondary {
            background-color: #6c757d;
            border-color: #6c757d;
        }
        .debug-section {
            border-top: 1px solid #dee2e6;
            padding-top: 1rem;
            margin-top: 1.5rem;
        }
        .debug-info {
            font-size: 12px;
            background: #f0f0f0;
            padding: 1rem;
            border-radius: 4px;
            white-space: pre-wrap;
            word-break: break-word;
            max-height: 300px;
            overflow: auto;
        }
        .content-panel {
            background-color: #fff;
            padding: 1.5rem;
            border: none;
            border-radius: 0.375rem;
            box-shadow: none;
            width: 100%;
            box-sizing: border-box;
            margin-bottom: 1.5rem;
        }
        .tags-section {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 0.25rem;
        }
        .tag-badge {
            font-size: 0.8em;
            padding: 0.4em 0.6em;
            display: inline-flex;
            align-items: center;
            background-color: #6c757d;
            color: white;
            border-radius: 0.25rem;
        }
        .tag-badge .btn-close {
            margin-left: 0.5em;
            width: 0.5em;
            height: 0.5em;
            filter: brightness(0) invert(1);
        }
        .add-tag-wrapper {
            position: relative;
            display: inline-flex;
            align-items: center;
        }
        .add-tag-input {
            min-width: 100px;
            width: auto;
            padding-right: 30px;
            display: inline-block;
            font-size: 0.875rem;
            padding: 0.25rem 0.5rem;
            height: calc(1.5em + 0.5rem + 2px);
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
            color: #6c757d;
            cursor: pointer;
        }
        .mat-mdc-dialog-actions {
            flex-shrink: 0;
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

    // Map to store full partner data for selects that use data-partners
    partnerDataMap: { [selectName: string]: any[] } = {};

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
                    const detailsDivHtml = `<div class="partner-details" id="details-${attributesObj['name']}" style="margin-bottom: 1.5rem; font-size: 0.875rem; color: #6c757d;"></div>`;
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
            let detailsHtml = '';
            if (selectedPartner.address) {
                detailsHtml += `<div>${this.sanitizer.sanitize(1, selectedPartner.address)}</div>`;
            }
            if (selectedPartner.ico || selectedPartner.ic_dph) {
                detailsHtml += `<div>`;
                if (selectedPartner.ico) {
                    detailsHtml += `IČO: ${this.sanitizer.sanitize(1, selectedPartner.ico)}`;
                }
                if (selectedPartner.ico && selectedPartner.ic_dph) {
                    detailsHtml += `, `;
                }
                if (selectedPartner.ic_dph) {
                    detailsHtml += `IČ DPH: ${this.sanitizer.sanitize(1, selectedPartner.ic_dph)}`;
                }
                detailsHtml += `</div>`;
            }

            // Use bypassSecurityTrustHtml carefully if generated HTML is complex or dynamic
            // For simple text display, sticking to sanitize might be safer if possible
            detailsDiv.innerHTML = detailsHtml; // Update the div content
        } else {
            detailsDiv.innerHTML = ''; // Clear if partner not found (should not happen ideally)
        }
    }

    ngOnInit(): void {
        // Initialize dynamic form controls after view is initialized
        setTimeout(() => {
            this.initializeFormControls();
            // Trigger initial details update for selects in edit mode
            if (this.data.mode === 'edit' && this.data.record) {
                this.updateInitialPartnerDetails();
            }

            // *** DEBUG: Check partnerDataMap content ***
            console.log('Partner Data Map after init:', JSON.stringify(this.partnerDataMap));

            // Focus logic
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

            // Initialize control with value from record in edit mode, otherwise empty string
            const initialValue = (this.data.mode === 'edit' && this.data.record?.data[name])
                                ? this.data.record.data[name]
                                : '';
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
            });

            // Set initial displayed value for edit mode (redundant due to form control init, but good practice)
            if (this.data.mode === 'edit' && this.data.record) {
                const value = this.data.record.data[name];
                if (htmlInput.type === 'checkbox' && htmlInput instanceof HTMLInputElement) {
                    htmlInput.checked = !!value;
                } else if (htmlInput.tagName !== 'SELECT') { // Don't reset select value here
                    htmlInput.value = value || '';
                }
            }
        });

        this.recordForm = this.fb.group(formControls);

        // Set initial values for SELECT elements specifically AFTER form group is created
        // This ensures Angular form control is aware of the value
        if (this.data.mode === 'edit' && this.data.record) {
             inputs.forEach((input: Element) => {
                if (input.tagName === 'SELECT') {
                    const htmlInput = input as HTMLSelectElement;
                    const name = htmlInput.getAttribute('name') || htmlInput.id;
                     if (name && this.data.record?.data[name]) {
                        htmlInput.value = this.data.record.data[name];
                    }
                }
            });
        }
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
