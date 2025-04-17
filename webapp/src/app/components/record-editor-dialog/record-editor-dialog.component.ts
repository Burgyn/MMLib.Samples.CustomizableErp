import { Component, Inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Evidence, EvidenceRecord } from '../../models/evidence.model';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
    selector: 'app-record-editor-dialog',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
    template: `
        <div class="record-editor-dialog" role="dialog" aria-labelledby="dialog-title">
            <h2 mat-dialog-title id="dialog-title" class="mb-3">{{ data.mode === 'create' ? 'New Record' : 'Edit Record' }}</h2>
            <div mat-dialog-content class="dialog-content">
                <form [formGroup]="recordForm" class="form-container" #formContainer>
                    <div [innerHTML]="formHtml" class="form-fields"></div>
                    <div class="debug-section mt-3" *ngIf="showDebug">
                        <pre class="debug-info">{{ debugInfo }}</pre>
                    </div>
                </form>
            </div>
            <div mat-dialog-actions align="end" class="dialog-actions">
                <button class="btn btn-outline-secondary btn-sm" (click)="toggleDebug()" type="button">
                    <i class="bi" [class.bi-bug]="!showDebug" [class.bi-bug-fill]="showDebug"></i>
                </button>
                <div class="flex-grow-1"></div>
                <button class="btn btn-secondary me-2" (click)="cancel()" #cancelButton>Cancel</button>
                <button class="btn btn-primary" (click)="save()" #saveButton>Save</button>
            </div>
        </div>
    `,
    styles: [`
        .record-editor-dialog {
            min-width: 400px;
            max-width: 800px;
            padding: 20px;
            background: white;
            border-radius: 8px;
        }
        .dialog-content {
            min-height: 100px;
            max-height: 80vh;
            overflow-y: auto;
            padding: 1rem;
        }
        .form-container {
            padding: 1rem 0;
        }
        .form-fields {
            display: flex;
            flex-direction: column;
            gap: 1rem;
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
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            display: flex;
            align-items: center;
        }
        .debug-section {
            border-top: 1px solid #dee2e6;
            padding-top: 1rem;
        }
        .debug-info {
            font-size: 12px;
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 4px;
            white-space: pre-wrap;
            word-break: break-word;
            max-height: 300px;
            overflow: auto;
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
        this.recordForm = this.fb.group({});
        console.log('Evidence Data:', data.evidence);
        this.debugInfo = `Form Definition: ${data.evidence.formDefinition}`;
        this.formHtml = this.sanitizer.bypassSecurityTrustHtml(
            this.extractFormHtml(data.evidence.formDefinition)
        );

        // Configure dialog
        this.dialogRef.addPanelClass('record-editor-dialog-container');
        this.dialogRef.updateSize('500px');
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
                    return comp.content;
                }

                // Determine the tag name
                const tagName = comp.tagName || 'div'; // Default to div if tagName is not specified

                // Build attributes string
                let attributes = '';
                if (comp.attributes) {
                    attributes = Object.entries(comp.attributes)
                        .map(([key, value]) => `${key}="${value}"`)
                        .join(' ');
                }

                // Add classes if any
                let classes = '';
                if (comp.classes) {
                    classes = comp.classes.map((c: any) => typeof c === 'string' ? c : c.name).join(' ');
                    if (classes) {
                        attributes += ` class="${comp.attributes?.class ? comp.attributes.class + ' ' : ''}${classes}"`;
                    }
                }

                // Handle void elements (elements that don't need a closing tag)
                const voidElements = ['input', 'img', 'br', 'hr'];
                if (voidElements.includes(tagName)) {
                    return `<${tagName} ${attributes.trim()} />`;
                }

                // Recursively generate HTML for child components
                let childrenHtml = '';
                if (comp.components && Array.isArray(comp.components)) {
                    childrenHtml = comp.components.map((child: any) => generateHtmlFromComponent(child)).join('');
                }

                // Add content for non-container elements like label or p
                let content = '';
                if (!comp.components && comp.content) {
                    content = comp.content;
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
        setTimeout(() => {
            this.initializeFormControls();
            const firstInput = this.formContainer.nativeElement.querySelector('input, select, textarea');
            if (firstInput) {
                firstInput.focus();
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

            if (!name) return;

            formControls[name] = [''];

            if (this.data.mode === 'edit' && this.data.record) {
                const value = this.data.record.data[name];
                htmlInput.value = value || '';
            }

            htmlInput.addEventListener('input', (e) => {
                const target = e.target as HTMLInputElement;
                this.recordForm.patchValue({ [name]: target.value });
            });
        });

        this.recordForm = this.fb.group(formControls);

        if (this.data.mode === 'edit' && this.data.record) {
            this.recordForm.patchValue(this.data.record.data);
        }
    }

    cancel(): void {
        this.dialogRef.close();
    }

    save(): void {
        if (this.recordForm.valid) {
            const record: Partial<EvidenceRecord> = {
                id: this.data.record?.id,
                evidenceId: this.data.evidence.id,
                data: this.recordForm.value,
                createdAt: this.data.record?.createdAt || new Date(),
                updatedAt: new Date()
            };
            this.dialogRef.close(record);
        }
    }
}
