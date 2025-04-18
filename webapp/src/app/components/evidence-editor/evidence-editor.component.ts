import { ActivatedRoute, Router } from '@angular/router';
import { Category, Evidence, GridColumn } from '../../models/evidence.model';
import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Editor, Component as GrapesComponent } from 'grapesjs';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { CommonModule } from '@angular/common';
import { EvidenceService } from '../../services/evidence.service';
import { FormsModule } from '@angular/forms';
import grapesjs from 'grapesjs';
import grapesjsBlocksBasic from 'grapesjs-blocks-basic';
import grapesjsPluginForms from 'grapesjs-plugin-forms';
import grapesjsPresetWebpage from 'grapesjs-preset-webpage';

// Define interfaces for dummy data if not already defined elsewhere
interface Partner { id: string; name: string; }
interface Iban { id: string; value: string; }

@Component({
    selector: 'app-evidence-editor',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule],
    template: `
        <div class="editor-container">
            <div class="toolbar p-3 border-bottom">
                <form [formGroup]="evidenceForm" class="row g-3">
                    <div class="col-md-6">
                        <input type="text"
                               class="form-control"
                               formControlName="name"
                               placeholder="Evidence Name">
                    </div>
                    <div class="col-md-6">
                        <select class="form-select"
                                formControlName="categoryId">
                            <option value="">Select Category</option>
                            <option *ngFor="let category of categories"
                                    [value]="category.id">
                                {{ category.name }}
                            </option>
                        </select>
                    </div>
                    <div class="col-12">
                        <button class="btn btn-primary me-2"
                                (click)="saveEvidence()"
                                [disabled]="!evidenceForm.valid">
                            <i class="bi bi-save"></i> Save
                        </button>
                        <button class="btn btn-outline-secondary"
                                (click)="showAiDialog()">
                            Try AI ✨
                        </button>
                    </div>
                </form>
            </div>
            <div class="editor-content" id="gjs"></div>
        </div>

        <!-- AI Dialog -->
        <div class="modal fade" id="aiDialog" tabindex="-1" aria-labelledby="aiDialogLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-dialog-scrollable modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="aiDialogLabel">Create Evidence with AI</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label for="aiPrompt" class="form-label">Describe the evidence you want to create:</label>
                            <textarea class="form-control" id="aiPrompt" rows="5" [(ngModel)]="aiPrompt" placeholder="Example: Create an evidence for tracking mobile phones assigned to employees. Include fields for phone model, employee name, purchase date, assignment date, notes, purchase price, monthly plan cost, etc."></textarea>
                        </div>
                        <div class="mb-3">
                            <label for="openaiApiKey" class="form-label">OpenAI API Key:</label>
                            <input type="password" class="form-control" id="openaiApiKey" [(ngModel)]="openaiApiKey" placeholder="sk-...">
                            <div class="form-text">Your API key is stored in your browser's local storage.</div>
                        </div>
                        <div *ngIf="isGenerating" class="d-flex justify-content-center">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <span class="ms-2">Generating evidence design...</span>
                        </div>
                        <div *ngIf="aiError" class="alert alert-danger">
                            {{ aiError }}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" [disabled]="!aiPrompt || !openaiApiKey || isGenerating" (click)="generateEvidenceWithAI()">Generate</button>
                    </div>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .editor-container {
            height: 100vh;
            display: flex;
            flex-direction: column;
        }

        .editor-content {
            flex: 1;
            overflow: hidden;
        }

        .toolbar {
            background: #fff;
        }

        :host ::ng-deep {
            .gjs-one-bg {
                background-color: #f8f9fa;
            }

            .gjs-two-color {
                color: #333;
            }

            .gjs-cv-canvas {
                width: 100%;
                height: 100%;
                top: 0;
                padding: 10px;
            }

            .gjs-frame-wrapper {
                padding: 20px;
                background-color: #f8f9fa;
            }

            .gjs-frame {
                background-color: #fff;
                border: 1px solid #dee2e6;
                border-radius: 6px;
                box-shadow: 0 3px 6px rgba(0,0,0,0.1);
            }
        }
    `]
})
export class EvidenceEditorComponent implements OnInit, OnDestroy {
    private editor: Editor | null = null;
    evidenceForm: FormGroup;
    private evidenceId: string | null = null;
    categories: Category[] = [];

    // AI evidence generation properties
    aiPrompt: string = '';
    openaiApiKey: string = '';
    isGenerating: boolean = false;
    aiError: string | null = null;
    private aiDialog: any; // Will hold the Bootstrap modal reference

    constructor(
        private fb: FormBuilder,
        private evidenceService: EvidenceService,
        private route: ActivatedRoute,
        private router: Router
    ) {
        this.evidenceForm = this.fb.group({
            name: ['', Validators.required],
            categoryId: ['', Validators.required]
        });
    }

    ngOnInit(): void {
        this.loadCategories();
        this.initializeEditor();

        this.route.params.subscribe(params => {
            if (params['id'] && params['id'] !== 'new') {
                this.loadEvidence(params['id']);
            }
        });

        // Load OpenAI API key from localStorage if available
        this.openaiApiKey = localStorage.getItem('openaiApiKey') || '';
    }

    ngOnDestroy(): void {
        if (this.editor) {
            this.editor.destroy();
        }
    }

    private initializeEditor(): void {
        this.editor = grapesjs.init({
            container: '#gjs',
            height: '100%',
            storageManager: false,
            plugins: [
              grapesjsPresetWebpage,
              grapesjsBlocksBasic,
              grapesjsPluginForms
            ],
            // Use custom CSS to control how elements appear in the editor
            protectedCss: `
                * {
                    box-sizing: border-box;
                }
                body {
                    height: auto;
                    min-height: 100%;
                    margin: 0;
                    padding: 30px !important;
                    background-color: #f8f9fa;
                    overflow-x: hidden;
                }
                .mb-3, .mb-4, div[class^="col-"], .form-group {
                    margin-bottom: 1rem !important;
                    padding: 0.5rem !important;
                }
                .form-control, .form-select {
                    padding: 0.4rem 0.6rem !important;
                    margin: 0.15rem 0 !important;
                }
                .gjs-dashed .gjs-selected {
                    outline: 2px solid #0d6efd !important;
                    outline-offset: 2px;
                }
            `,
            canvas: {
                styles: [
                    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
                    `
/* Custom styles for GrapesJS canvas elements */
body {
  font-family: Ubuntu, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Noto Sans, Liberation Sans, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", Segoe UI Symbol, "Noto Color Emoji";
  background-color: #fff;
  padding: 30px !important; /* Moderate padding */
  color: #212529;
  margin: 0 auto;
  max-width: 1200px;
}

.form-label {
  font-size: 0.875rem;
  color: #6c757d; /* Lighter color like in the screenshot */
  margin-bottom: 0.5rem;
  font-weight: 500; /* Slightly bolder labels */
}

.form-control,
.form-select {
  border-radius: 0.25rem; /* Slightly less rounded corners */
  border: 1px solid #dee2e6; /* Standard light gray border */
  padding: 0.375rem 0.75rem; /* Standard padding */
  font-size: 1rem;
  background-color: #fff;
}

.form-control:focus,
.form-select:focus {
  border-color: #86b7fe; /* Standard Bootstrap focus color */
  box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25); /* Standard Bootstrap focus shadow */
}

/* Ensure consistent spacing for dropped components */
.mb-3 {
  margin-bottom: 1rem !important;
}
`
                ],
                scripts: [
                    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js'
                ]
            },
            // Set up custom configuration of the editor
            fromElement: false,
            selectorManager: { componentFirst: true },
            styleManager: { sectors: [] },
            panels: { defaults: [] },
            deviceManager: { devices: [] },
            blockManager: {
                blocks: [
                    {
                        id: 'text-input',
                        label: 'Text Input',
                        category: 'Form Fields',
                        media: '<i class="bi bi-input-cursor-text fs-4"></i>',
                        content: `<div class="mb-3">
                            <label class="form-label">Text Field</label>
                            <input type="text" class="form-control" data-gjs-type="text-input"/>
                        </div>`,
                        attributes: { 'data-gjs-type': 'text-input' }
                    },
                    {
                        id: 'number-input',
                        label: 'Number Input',
                        category: 'Form Fields',
                        media: '<i class="bi bi-hash fs-4"></i>',
                        content: `<div class="mb-3">
                            <label class="form-label">Number Field</label>
                            <input type="number" class="form-control" data-gjs-type="number-input"/>
                        </div>`,
                        attributes: { 'data-gjs-type': 'number-input' }
                    },
                    {
                        id: 'date-input',
                        label: 'Date Input',
                        category: 'Form Fields',
                        media: '<i class="bi bi-calendar-date fs-4"></i>',
                        content: `<div class="mb-3">
                            <label class="form-label">Date Field</label>
                            <input type="date" class="form-control" data-gjs-type="date-input"/>
                        </div>`,
                        attributes: { 'data-gjs-type': 'date-input' }
                    },
                    {
                        id: 'select',
                        label: 'Select',
                        category: 'Form Fields',
                        media: '<i class="bi bi-menu-button-wide fs-4"></i>',
                        content: `<div class="mb-3">
                            <label class="form-label">Select Field</label>
                            <select class="form-select" data-gjs-type="select">
                                <option value="">Select an option</option>
                            </select>
                        </div>`,
                         attributes: { 'data-gjs-type': 'select' }
                    },
                    {
                        id: 'textarea',
                        label: 'Text Area',
                        category: 'Form Fields',
                        media: '<i class="bi bi-textarea fs-4"></i>',
                        content: `<div class="mb-3">
                            <label class="form-label">Text Area</label>
                            <textarea class="form-control" data-gjs-type="textarea"></textarea>
                        </div>`,
                        attributes: { 'data-gjs-type': 'textarea' }
                    },
                    {
                        id: 'checkbox-input',
                        label: 'Checkbox',
                        category: 'Form Fields',
                        media: '<i class="bi bi-check-square fs-4"></i>',
                        content: `<div class="form-check mb-3">
                            <input class="form-check-input" type="checkbox" value="" data-gjs-type="checkbox-input">
                            <label class="form-check-label">
                                Checkbox Label
                            </label>
                          </div>`,
                         attributes: { 'data-gjs-type': 'checkbox-input' }
                    },
                    {
                        id: 'radio-input',
                        label: 'Radio Button',
                        category: 'Form Fields',
                        media: '<i class="bi bi-ui-radios fs-4"></i>',
                        content: `<div class="form-check mb-3">
                            <input class="form-check-input" type="radio" value="" data-gjs-type="radio-input">
                            <label class="form-check-label">
                              Radio Label
                            </label>
                          </div>`,
                         attributes: { 'data-gjs-type': 'radio-input' }
                    },
                    {
                        id: 'partner-select-block',
                        label: 'Partner Selector',
                        category: 'Economic Fields',
                        media: '<i class="bi bi-person-lines-fill fs-4"></i>',
                        content: `<div class="mb-3">
                            <label class="form-label">Odberateľ</label>
                            <select class="form-select" data-gjs-type="partner-select"></select>
                        </div>`,
                        attributes: { 'data-gjs-type': 'partner-select', 'data-gjs-displayName': 'Odberateľ' }
                    },
                    {
                        id: 'iban-select-block',
                        label: 'IBAN Selector',
                        category: 'Economic Fields',
                        media: '<i class="bi bi-bank fs-4"></i>',
                        content: `<div class="mb-3">
                            <label class="form-label">IBAN / Číslo účtu</label>
                            <select class="form-select" data-gjs-type="select" name="ibanId">
                                <option value="">Vyberte IBAN...</option>
                                <option value="1">SK1234567890123456789012</option>
                                <option value="2">SK9876543210987654321098</option>
                                <option value="3">SK4567890123456789012345</option>
                                <option value="4">SK7890123456789012345678</option>
                            </select>
                        </div>`,
                        attributes: { 'data-gjs-type': 'select', 'data-gjs-name': 'ibanId', 'data-gjs-displayName': 'IBAN / Číslo účtu' }
                    },
                     {
                        id: 'issue-date-block',
                        label: 'Dátum vystavenia',
                        category: 'Economic Fields',
                        media: '<i class="bi bi-calendar-date fs-4"></i>',
                        content: `<div class="mb-3">
                            <label class="form-label">Dátum vystavenia</label>
                            <input type="date" class="form-control" data-gjs-type="date-input" name="issueDate"/>
                        </div>`,
                        attributes: { 'data-gjs-type': 'date-input', 'data-gjs-name': 'issueDate', 'data-gjs-displayName': 'Dátum vystavenia', 'data-gjs-required': true }
                    },
                     {
                        id: 'variable-symbol-block',
                        label: 'Variabilný symbol',
                        category: 'Economic Fields',
                        media: '<i class="bi bi-input-cursor-text fs-4"></i>',
                        content: `<div class="mb-3">
                            <label class="form-label">Variabilný symbol</label>
                            <input type="text" class="form-control" data-gjs-type="text-input" name="variableSymbol"/>
                        </div>`,
                        attributes: { 'data-gjs-type': 'text-input', 'data-gjs-name': 'variableSymbol', 'data-gjs-displayName': 'Variabilný symbol', 'data-gjs-required': true }
                    },
                    {
                        id: 'payment-method-block',
                        label: 'Spôsob úhrady',
                        category: 'Economic Fields',
                        media: '<i class="bi bi-cash-coin fs-4"></i>',
                        content: `<div class="mb-3">
                            <label class="form-label">Spôsob úhrady</label>
                            <select class="form-select" data-gjs-type="select" name="paymentMethod">
                                <option value="cash">Hotovosť</option>
                                <option value="online">Online platba</option>
                                <option value="cod">Dobierka</option>
                            </select>
                        </div>`,
                        attributes: { 'data-gjs-type': 'select', 'data-gjs-name': 'paymentMethod', 'data-gjs-displayName': 'Spôsob úhrady', 'data-gjs-required': true }
                    },
                    {
                        id: 'due-date-block',
                        label: 'Splatnosť',
                        category: 'Economic Fields',
                        media: '<i class="bi bi-calendar-check fs-4"></i>',
                        content: `<div class="mb-3">
                                    <label class="form-label">Splatnosť</label>
                                    <div class="input-group">
                                        <input type="number" class="form-control" placeholder="Dní" data-gjs-type="due-date-days"/>
                                        <input type="date" class="form-control" data-gjs-type="due-date-date"/>
                                    </div>
                                 </div>`,
                        attributes: { 'data-gjs-type': 'due-date', 'data-gjs-displayName': 'Splatnosť' }
                    },
                    {
                        id: 'currency-rate-block',
                        label: 'Mena/Kurz',
                        category: 'Economic Fields',
                        media: '<i class="bi bi-currency-euro fs-4"></i>',
                        content: `<div class="mb-3">
                                    <label class="form-label">Mena / Kurz</label>
                                    <div class="input-group">
                                        <select class="form-select" style="flex: 0 0 auto; width: auto;" data-gjs-type="currency-rate-currency">
                                             <option value="EUR">EUR</option>
                                             <option value="CZK">CZK</option>
                                             <option value="USD">USD</option>
                                        </select>
                                        <input type="number" class="form-control" value="1.00" step="0.01" data-gjs-type="currency-rate-rate"/>
                                    </div>
                                 </div>`,
                         attributes: { 'data-gjs-type': 'currency-rate', 'data-gjs-displayName': 'Mena/Kurz' }
                    },
                ]
            }
        });

        // Manually remove default form blocks from grapesjs-plugin-forms
        const blockManager = this.editor.BlockManager;
        const blocksToRemove = ['form', 'input', 'textarea', 'select', 'button', 'label', 'checkbox', 'radio'];
        blocksToRemove.forEach(blockId => {
            const block = blockManager.get(blockId);
            if (block) {
                blockManager.remove(blockId);
            }
        });

        // Define component types and their traits
        this.editor.DomComponents.addType('text-input', {
            isComponent: (el) => el.getAttribute && el.getAttribute('data-gjs-type') === 'text-input',
            model: {
                defaults: {
                    traits: [
                        { type: 'text', name: 'name', label: 'Field Name (ID)' },
                        { type: 'text', name: 'displayName', label: 'Display Name' },
                        { type: 'text', name: 'placeholder', label: 'Placeholder' },
                        { type: 'checkbox', name: 'required', label: 'Required' }
                    ]
                }
            }
        });

        this.editor.DomComponents.addType('number-input', {
            isComponent: (el) => el.getAttribute && el.getAttribute('data-gjs-type') === 'number-input',
            model: {
                defaults: {
                    traits: [
                        { type: 'text', name: 'name', label: 'Field Name (ID)' },
                        { type: 'text', name: 'displayName', label: 'Display Name' },
                        { type: 'checkbox', name: 'required', label: 'Required' }
                    ]
                }
            }
        });

        this.editor.DomComponents.addType('date-input', {
            isComponent: (el) => el.getAttribute && el.getAttribute('data-gjs-type') === 'date-input',
            model: {
                defaults: {
                    traits: [
                        { type: 'text', name: 'name', label: 'Field Name (ID)' },
                        { type: 'text', name: 'displayName', label: 'Display Name', default: 'Dátum vystavenia' },
                        { type: 'checkbox', name: 'required', label: 'Required' }
                    ]
                }
            }
        });

        this.editor.DomComponents.addType('select', {
            isComponent: (el) => el.getAttribute && el.getAttribute('data-gjs-type') === 'select',
            model: {
                defaults: {
                    traits: [
                        { type: 'text', name: 'name', label: 'Field Name (ID)' },
                        { type: 'text', name: 'displayName', label: 'Display Name' },
                        { type: 'checkbox', name: 'required', label: 'Required' }
                    ]
                }
            }
        });

        this.editor.DomComponents.addType('textarea', {
            isComponent: (el) => el.getAttribute && el.getAttribute('data-gjs-type') === 'textarea',
            model: {
                defaults: {
                    traits: [
                        { type: 'text', name: 'name', label: 'Field Name (ID)' },
                        { type: 'text', name: 'displayName', label: 'Display Name' },
                        { type: 'text', name: 'placeholder', label: 'Placeholder' },
                        { type: 'checkbox', name: 'required', label: 'Required' }
                    ]
                }
            }
        });

        this.editor.DomComponents.addType('checkbox-input', {
            isComponent: (el) => el.getAttribute && el.getAttribute('data-gjs-type') === 'checkbox-input',
            model: {
                defaults: {
                    traits: [
                        { type: 'text', name: 'name', label: 'Field Name (ID)' },
                        { type: 'text', name: 'displayName', label: 'Display Name' },
                        { type: 'text', name: 'value', label: 'Checked Value', default: 'true' },
                        { type: 'text', name: 'label', label: 'Checkbox Label' },
                        { type: 'checkbox', name: 'required', label: 'Required' },
                        { type: 'checkbox', name: 'checked', label: 'Checked by default' }
                    ]
                }
            },
            view: {
                onRender({ model }: { model: GrapesComponent }) {
                    const elInput = this.el.querySelector('input');
                    const labelEl = this.el.querySelector('.form-check-label');
                    if (labelEl) {
                        labelEl.textContent = model.getTrait('label')?.get('value') || 'Checkbox Label';
                    }
                    if (elInput) elInput.checked = !!model.get('checked');
                },
                events: {
                    'change input[type=checkbox]': 'onChange',
                } as any,
                onChange(ev: Event) {
                    const checked = (ev.target as HTMLInputElement).checked;
                    this.model.set('checked', checked);
                },
                init() {
                    this.listenTo(this.model.get('traits'), 'change:value', this['handleTraitChange']);
                },
                handleTraitChange(trait: any) {
                    if (trait.get('name') === 'label') {
                         const labelEl = this.el.querySelector('.form-check-label');
                         if (labelEl) labelEl.textContent = trait.get('value') || 'Checkbox Label';
                    }
                    if (trait.get('name') === 'checked') {
                         const elInput = this.el.querySelector('input');
                         if (elInput) elInput.checked = !!trait.get('value');
                         this.model.set('checked', !!trait.get('value'));
                    }
                },
            }
        });

        this.editor.DomComponents.addType('radio-input', {
            isComponent: (el) => el.getAttribute && el.getAttribute('data-gjs-type') === 'radio-input',
            model: {
                defaults: {
                    traits: [
                        { type: 'text', name: 'name', label: 'Group Name (ID)' },
                        { type: 'text', name: 'displayName', label: 'Display Name' },
                        { type: 'text', name: 'value', label: 'Value' },
                        { type: 'text', name: 'label', label: 'Radio Label' },
                        { type: 'checkbox', name: 'required', label: 'Required' },
                        { type: 'checkbox', name: 'checked', label: 'Checked by default' }
                    ]
                }
            },
            view: {
                onRender({ model }: { model: GrapesComponent }) {
                    const elInput = this.el.querySelector('input');
                    const labelEl = this.el.querySelector('.form-check-label');
                    if (labelEl) {
                        labelEl.textContent = model.getTrait('label')?.get('value') || 'Radio Label';
                    }
                    if (elInput) {
                         elInput.name = model.getTrait('name')?.get('value') || '';
                         elInput.checked = !!model.get('checked');
                    }
                },
                events: {
                    'change input[type=radio]': 'onChange',
                } as any,
                onChange(ev: Event) {
                    const checked = (ev.target as HTMLInputElement).checked;
                    this.model.set('checked', checked);
                },
                init() {
                    this.listenTo(this.model.get('traits'), 'change:value', this['handleTraitChange']);
                },
                handleTraitChange(trait: any) {
                    const elInput = this.el.querySelector('input');
                    if (!elInput) return;

                    const traitName = trait.get('name');
                    const traitValue = trait.get('value');

                    if (traitName === 'label') {
                        const labelEl = this.el.querySelector('.form-check-label');
                        if (labelEl) labelEl.textContent = traitValue || 'Radio Label';
                    }
                    if (traitName === 'name') {
                        elInput.name = traitValue || '';
                        this.model.set('name', traitValue);
                    }
                    if (traitName === 'checked') {
                        elInput.checked = !!traitValue;
                        this.model.set('checked', !!traitValue);
                    }
                },
            }
        });

        // New Component Type: partner-select
        this.editor.DomComponents.addType('partner-select', {
            isComponent: (el) => el.getAttribute && el.getAttribute('data-gjs-type') === 'partner-select',
            model: {
                defaults: {
                    traits: [
                        { type: 'text', name: 'name', label: 'Field Name (ID)', default: 'partnerId' },
                        { type: 'text', name: 'displayName', label: 'Display Name', default: 'Odberateľ' },
                        { type: 'checkbox', name: 'required', label: 'Required' }
                    ],
                    script: function() { // Script executed in the canvas iframe
                        const selectElement = this as unknown as HTMLSelectElement;
                        const componentId = selectElement.getAttribute('data-gjs-comp-id'); // Custom attribute to link back
                        // Use postMessage to request data from the Angular component
                        window.parent.postMessage({ type: 'fetchPartners', componentId: componentId }, '*');
                    }
                }
            },
             view: { // View logic runs in the editor context
                init() {
                    this.listenTo(this.model, 'change:attributes', this['handleDataResponse']);
                    // Add a unique ID attribute to the element in the canvas for correlation
                    const componentId = this.model.getId();
                    this.model.addAttributes({ 'data-gjs-comp-id': componentId });
                },
                handleDataResponse(model: GrapesComponent, attributes: any) {
                   // This check is basic, might need refinement if attributes change often
                    if (attributes['data-partners']) {
                        const partners = JSON.parse(attributes['data-partners']);
                        const selectEl = this.el.querySelector('select');
                        if (selectEl) {
                            selectEl.innerHTML = '<option value="">Vyberte partnera...</option>'; // Clear previous
                            partners.forEach((p: Partner) => {
                                const option = document.createElement('option');
                                option.value = p.id;
                                option.textContent = p.name;
                                selectEl.appendChild(option);
                            });
                            // Remove the temporary attribute
                            model.removeAttributes('data-partners');
                        }
                    }
                },
                // Need a mechanism to trigger data fetch again if needed
            }
        });

        // New Component Type: due-date (composite)
        this.editor.DomComponents.addType('due-date', {
             isComponent: (el) => el.getAttribute && el.getAttribute('data-gjs-type') === 'due-date',
             model: {
                 defaults: {
                     traits: [
                         { type: 'text', name: 'name', label: 'Field Name (ID)', default: 'dueDateInfo' },
                         { type: 'text', name: 'displayName', label: 'Display Name', default: 'Splatnosť' },
                         { type: 'number', name: 'defaultDays', label: 'Default Due Days', default: 14 },
                         { type: 'checkbox', name: 'required', label: 'Required' }
                     ],
                     attributes: { 'data-gjs-displayName': 'Splatnosť' }
                 }
             },
             view: { // Add view logic for interaction if required
             }
        });

         // New Component Type: currency-rate (composite)
        this.editor.DomComponents.addType('currency-rate', {
             isComponent: (el) => el.getAttribute && el.getAttribute('data-gjs-type') === 'currency-rate',
             model: {
                 defaults: {
                     traits: [
                         { type: 'text', name: 'name', label: 'Field Name (ID)', default: 'currencyRateInfo' },
                         { type: 'text', name: 'displayName', label: 'Display Name', default: 'Mena/Kurz' },
                         { type: 'select', name: 'defaultCurrency', label: 'Default Currency', options: [ { id: 'EUR', name: 'EUR' }, { id: 'CZK', name: 'CZK' }, { id: 'USD', name: 'USD' } ], default: 'EUR' },
                         { type: 'checkbox', name: 'required', label: 'Required' }
                     ],
                      // Add script/view logic if interaction (e.g., setting rate based on currency) is needed.
                 }
             },
             view: {
             }
        });

        // --- Message Listener for Data Fetching (add this in the component class) ---
        this.setupiframeMessageListener();
    }

    // --- Add this method to handle messages from iframe ---
    private setupiframeMessageListener(): void {
        window.addEventListener('message', event => {
            // IMPORTANT: Add origin check for security
            // if (event.origin !== 'expected_iframe_origin') return;

            const { type, componentId } = event.data;

            if (type === 'fetchPartners' && componentId && this.editor) {
                this.evidenceService.getPartners().subscribe(partners => {
                    const component = this.editor?.DomComponents.componentsById[componentId];
                    if (component) {
                        // Pass data back via temporary attribute change
                         component.addAttributes({ 'data-partners': JSON.stringify(partners) });
                    }
                });
            }

            // We've removed the IBAN-select component in favor of a regular select
            // No need to fetch IBAN data anymore
        });
    }

    private loadEvidence(id: string): void {
        this.evidenceService.getEvidence(id).subscribe(evidence => {
            if (evidence) {
                this.evidenceId = evidence.id;
                this.evidenceForm.patchValue({
                    name: evidence.name,
                    categoryId: evidence.categoryId
                });
                if (this.editor && evidence.formDefinition) {
                    this.editor.loadData(JSON.parse(evidence.formDefinition));
                }
            }
        });
    }

    saveEvidence(): void {
        if (!this.editor || !this.evidenceForm.valid) return;

        const formDefinition = JSON.stringify(this.editor.getProjectData());
        const gridColumns = this.extractGridColumns(this.editor);

        const evidence: Evidence = {
            id: this.evidenceId || crypto.randomUUID(),
            name: this.evidenceForm.value.name,
            categoryId: this.evidenceForm.value.categoryId,
            formDefinition,
            gridColumns,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.evidenceService.saveEvidence(evidence).subscribe(() => {
            this.router.navigate(['/evidence', evidence.id]);
        });
    }

    private extractGridColumns(editor: Editor): GridColumn[] {
        const columns: GridColumn[] = [];
        const wrapper = editor.DomComponents.getWrapper();
        if (!wrapper) return columns;

        // Find components with a defined 'name' trait that has a value
        const components = wrapper.find('[data-gjs-type]'); // Get all types first

        components.forEach((component: GrapesComponent) => {
            const nameTrait = component.getTrait('name');
            const name = nameTrait?.get('value');

            // Only add column if name trait exists and has a non-empty value
            if (name) {
                const displayNameTrait = component.getTrait('displayName');
                const displayName = displayNameTrait?.get('value');
                const componentTypeAttr = component.getAttributes()['data-gjs-type'] || component.get('type') || 'string';

                // Special handling for composite types if needed
                let finalType = componentTypeAttr;
                 if ([ 'partner-select', 'due-date', 'currency-rate'].includes(finalType)) {
                    // Decide how to represent composite types in the grid
                    // For now, treat them as string (displaying the selected value or main identifier)
                    finalType = 'string';
                }

                columns.push({
                    field: name,
                    headerName: displayName || name.charAt(0).toUpperCase() + name.slice(1),
                    type: this.getColumnType(finalType), // Pass potentially modified type
                    sortable: true,
                    filter: true
                });
            }
        });

        // Filter out potential duplicates if multiple inner elements have the same name
        const uniqueColumns = Array.from(new Map(columns.map(col => [col.field, col])).values());

        return uniqueColumns;
    }

    private getColumnType(componentType: string): string {
        switch (componentType) {
            case 'number-input':
            case 'currency-rate-rate': // Example if we targeted inner elements
                return 'number';
            case 'date-input':
            case 'due-date-date': // Example if we targeted inner elements
                return 'date';
            case 'checkbox-input':
                return 'boolean';
             // case 'partner-select': // Already handled above, mapping to string
             // case 'due-date':
             // case 'currency-rate':
            default:
                return 'string';
        }
    }

    private loadCategories(): void {
        this.evidenceService.getAllCategories().subscribe(categories => {
            this.categories = categories;
        });
    }

    // AI Dialog Methods
    showAiDialog(): void {
        // Initialize modal if not already done
        if (!this.aiDialog) {
            this.aiDialog = new (window as any).bootstrap.Modal(document.getElementById('aiDialog'));
        }
        this.aiError = null;
        this.aiDialog.show();
    }

    generateEvidenceWithAI(): void {
        if (!this.aiPrompt || !this.openaiApiKey) return;

        // Save API key to localStorage
        localStorage.setItem('openaiApiKey', this.openaiApiKey);

        this.isGenerating = true;
        this.aiError = null;

        // Craft the prompt with information about available components
        const systemPrompt = this.createSystemPrompt();

        // Call OpenAI API
        this.callOpenAI(systemPrompt, this.aiPrompt)
            .then(response => {
                try {
                    // Process the response and create the evidence
                    this.processAiResponse(response);
                    // Close the dialog
                    this.aiDialog.hide();
                } catch (err) {
                    this.aiError = `Error processing AI response: ${err instanceof Error ? err.message : String(err)}`;
                }
            })
            .catch(error => {
                this.aiError = `Error calling OpenAI API: ${error.message || 'Unknown error'}`;
            })
            .finally(() => {
                this.isGenerating = false;
            });
    }

    private createSystemPrompt(): string {
        return `You are an expert in designing evidence forms for a business application.
        Your task is to create an evidence structure based on the user's description.

        Available Form Components:
        1. Text Input - For general text values
        2. Number Input - For numeric values
        3. Date Input - For date values
        4. Select - For dropdown selections
        5. Textarea - For larger text content
        6. Checkbox - For boolean values
        7. Radio Button - For single selection from a group
        8. Partner Select - For selecting business partners/customers

        Special Components:
        - IBAN Selector - For bank account selection
        - Issue Date - Standard date field for document issuance
        - Variable Symbol - For payment reference numbers
        - Payment Method - Dropdown for payment types
        - Due Date - Combined number of days and date
        - Currency/Rate - For currency selection and exchange rate

        IMPORTANT: Use Slovak language for all labels and display names, but keep field names in English camelCase.

        Your response should be valid JSON with the following structure:
        {
          "name": "Form name in Slovak",
          "components": [
            {
              "type": "text-input|number-input|date-input|select|textarea|checkbox-input|radio-input|partner-select|etc",
              "name": "fieldNameInEnglish",
              "label": "Field Label in Slovak",
              "required": true|false,
              "options": ["Option1 in Slovak", "Option2 in Slovak"] // Only for select, radio
            }
          ]
        }

        Rules:
        - Create appropriate field names in English (camelCase, no spaces)
        - Create all labels and display names in Slovak language
        - Determine which fields should be required
        - For select/dropdown fields, provide reasonable options in Slovak
        - Order fields logically
        - Only include components from the available list
        - Determine the most appropriate component type for each field
        - Respond ONLY with the JSON, no other text`;
    }

    private async callOpenAI(systemPrompt: string, userPrompt: string): Promise<any> {
        const url = 'https://api.openai.com/v1/chat/completions';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.openaiApiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4-turbo-preview', // Using GPT-4 for better results
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `HTTP error ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    private processAiResponse(responseText: string): void {
        // Try to parse the JSON response
        let formDefinition;
        try {
            // Extract JSON if it's wrapped in markdown code blocks
            if (responseText.includes('```json')) {
                const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
                if (jsonMatch && jsonMatch[1]) {
                    formDefinition = JSON.parse(jsonMatch[1]);
                } else {
                    formDefinition = JSON.parse(responseText);
                }
            } else {
                formDefinition = JSON.parse(responseText);
            }
        } catch (e) {
            throw new Error('Failed to parse AI response as JSON');
        }

        if (!formDefinition || !formDefinition.components || !Array.isArray(formDefinition.components)) {
            throw new Error('Invalid AI response format');
        }

        // Update the form name
        if (formDefinition.name) {
            this.evidenceForm.patchValue({
                name: formDefinition.name
            });
        }

        // Clear existing content in the editor
        if (this.editor) {
            this.editor.DomComponents.clear();
        }

        // Add components to the editor
        this.addComponentsToEditor(formDefinition.components);
    }

    private addComponentsToEditor(components: any[]): void {
        if (!this.editor) return;

        // Get the wrapper component to add components to
        const wrapper = this.editor.DomComponents.getWrapper();
        if (!wrapper) return;

        // Add a container for the form
        const formContainer = this.editor.DomComponents.addComponent({
            tagName: 'div',
            attributes: {
                class: 'container',
                style: 'padding: 1.5rem; margin: 1rem auto; max-width: 95%; background-color: #ffffff;'
            }
        }) as GrapesComponent;

        // Process each component from the AI response
        components.forEach(comp => {
            let component: any;

            switch (comp.type) {
                case 'text-input':
                    component = this.editor?.DomComponents.addComponent({
                        tagName: 'div',
                        attributes: { class: 'mb-3' },
                        components: [
                            {
                                tagName: 'label',
                                attributes: { class: 'form-label' },
                                content: comp.label
                            },
                            {
                                tagName: 'input',
                                attributes: {
                                    type: 'text',
                                    class: 'form-control',
                                    'data-gjs-type': 'text-input',
                                    name: comp.name,
                                    ...(comp.required ? { required: true } : {})
                                },
                                type: 'text-input',
                                traits: [
                                    { type: 'text', name: 'name', value: comp.name },
                                    { type: 'text', name: 'displayName', value: comp.label },
                                    { type: 'text', name: 'placeholder', value: '' },
                                    { type: 'checkbox', name: 'required', value: comp.required || false }
                                ]
                            }
                        ]
                    }, { at: formContainer.get('components')?.length || 0 });
                    break;

                case 'number-input':
                    component = this.editor?.DomComponents.addComponent({
                        tagName: 'div',
                        attributes: { class: 'mb-3' },
                        components: [
                            {
                                tagName: 'label',
                                attributes: { class: 'form-label' },
                                content: comp.label
                            },
                            {
                                tagName: 'input',
                                attributes: {
                                    type: 'number',
                                    class: 'form-control',
                                    'data-gjs-type': 'number-input',
                                    name: comp.name,
                                    ...(comp.required ? { required: true } : {})
                                },
                                type: 'number-input',
                                traits: [
                                    { type: 'text', name: 'name', value: comp.name },
                                    { type: 'text', name: 'displayName', value: comp.label },
                                    { type: 'checkbox', name: 'required', value: comp.required || false }
                                ]
                            }
                        ]
                    }, { at: formContainer.get('components')?.length || 0 });
                    break;

                case 'date-input':
                    component = this.editor?.DomComponents.addComponent({
                        tagName: 'div',
                        attributes: { class: 'mb-3' },
                        components: [
                            {
                                tagName: 'label',
                                attributes: { class: 'form-label' },
                                content: comp.label
                            },
                            {
                                tagName: 'input',
                                attributes: {
                                    type: 'date',
                                    class: 'form-control',
                                    'data-gjs-type': 'date-input',
                                    name: comp.name,
                                    ...(comp.required ? { required: true } : {})
                                },
                                type: 'date-input',
                                traits: [
                                    { type: 'text', name: 'name', value: comp.name },
                                    { type: 'text', name: 'displayName', value: comp.label },
                                    { type: 'checkbox', name: 'required', value: comp.required || false }
                                ]
                            }
                        ]
                    }, { at: formContainer.get('components')?.length || 0 });
                    break;

                case 'select':
                    const selectOptions = [];

                    if (comp.options && Array.isArray(comp.options)) {
                        for (const opt of comp.options) {
                            selectOptions.push({
                                tagName: 'option',
                                attributes: { value: opt.toLowerCase().replace(/\s+/g, '_') },
                                content: opt
                            });
                        }
                    }

                    const selectComponents = [
                        {
                            tagName: 'label',
                            attributes: { class: 'form-label' },
                            content: comp.label
                        },
                        {
                            tagName: 'select',
                            attributes: {
                                class: 'form-select',
                                'data-gjs-type': 'select',
                                name: comp.name,
                                ...(comp.required ? { required: true } : {})
                            },
                            type: 'select',
                            traits: [
                                { type: 'text', name: 'name', value: comp.name },
                                { type: 'text', name: 'displayName', value: comp.label },
                                { type: 'checkbox', name: 'required', value: comp.required || false }
                            ],
                            components: [
                                {
                                    tagName: 'option',
                                    attributes: { value: '' },
                                    content: `Select ${comp.label}`
                                },
                                ...selectOptions
                            ]
                        }
                    ];

                    component = this.editor?.DomComponents.addComponent({
                        tagName: 'div',
                        attributes: { class: 'mb-3' },
                        components: selectComponents
                    }, { at: formContainer.get('components')?.length || 0 });
                    break;

                case 'textarea':
                    component = this.editor?.DomComponents.addComponent({
                        tagName: 'div',
                        attributes: { class: 'mb-3' },
                        components: [
                            {
                                tagName: 'label',
                                attributes: { class: 'form-label' },
                                content: comp.label
                            },
                            {
                                tagName: 'textarea',
                                attributes: {
                                    class: 'form-control',
                                    'data-gjs-type': 'textarea',
                                    name: comp.name,
                                    ...(comp.required ? { required: true } : {})
                                },
                                type: 'textarea',
                                traits: [
                                    { type: 'text', name: 'name', value: comp.name },
                                    { type: 'text', name: 'displayName', value: comp.label },
                                    { type: 'text', name: 'placeholder', value: '' },
                                    { type: 'checkbox', name: 'required', value: comp.required || false }
                                ]
                            }
                        ]
                    }, { at: formContainer.get('components')?.length || 0 });
                    break;

                case 'checkbox-input':
                    component = this.editor?.DomComponents.addComponent({
                        tagName: 'div',
                        attributes: { class: 'form-check mb-3' },
                        components: [
                            {
                                tagName: 'input',
                                attributes: {
                                    class: 'form-check-input',
                                    type: 'checkbox',
                                    'data-gjs-type': 'checkbox-input',
                                    name: comp.name,
                                    ...(comp.required ? { required: true } : {})
                                },
                                type: 'checkbox-input',
                                traits: [
                                    { type: 'text', name: 'name', value: comp.name },
                                    { type: 'text', name: 'displayName', value: comp.label },
                                    { type: 'text', name: 'value', value: 'true' },
                                    { type: 'text', name: 'label', value: comp.label },
                                    { type: 'checkbox', name: 'required', value: comp.required || false },
                                    { type: 'checkbox', name: 'checked', value: false }
                                ]
                            },
                            {
                                tagName: 'label',
                                attributes: { class: 'form-check-label' },
                                content: comp.label
                            }
                        ]
                    }, { at: formContainer.get('components')?.length || 0 });
                    break;

                case 'radio-input':
                    if (comp.options && Array.isArray(comp.options)) {
                        // Create radio buttons as HTML instead of nested components
                        let radioHtml = `<div class="mb-3">
                            <label class="form-label d-block">${comp.label}</label>`;

                        comp.options.forEach((opt: string, idx: number) => {
                            const optValue = opt.toLowerCase().replace(/\s+/g, '_');
                            const optId = `${comp.name}_${idx}`;
                            const requiredAttr = idx === 0 && comp.required ? 'required' : '';

                            radioHtml += `
                            <div class="form-check">
                                <input class="form-check-input" type="radio"
                                    id="${optId}" name="${comp.name}" value="${optValue}"
                                    data-gjs-type="radio-input" ${requiredAttr}>
                                <label class="form-check-label" for="${optId}">${opt}</label>
                            </div>`;
                        });

                        radioHtml += `</div>`;

                        // Add entire radio group as a single component with HTML
                        component = this.editor?.DomComponents.addComponent({
                            type: 'text',
                            content: radioHtml,
                            traits: [
                                { type: 'text', name: 'name', value: comp.name },
                                { type: 'text', name: 'displayName', value: comp.label }
                            ]
                        }, { at: formContainer.get('components')?.length || 0 });
                    }
                    break;

                case 'partner-select':
                    component = this.editor?.DomComponents.addComponent({
                        tagName: 'div',
                        attributes: { class: 'mb-3' },
                        components: [
                            {
                                tagName: 'label',
                                attributes: { class: 'form-label' },
                                content: comp.label
                            },
                            {
                                tagName: 'select',
                                attributes: {
                                    class: 'form-select',
                                    'data-gjs-type': 'partner-select',
                                    name: comp.name,
                                    ...(comp.required ? { required: true } : {})
                                },
                                type: 'partner-select',
                                traits: [
                                    { type: 'text', name: 'name', value: comp.name },
                                    { type: 'text', name: 'displayName', value: comp.label },
                                    { type: 'checkbox', name: 'required', value: comp.required || false }
                                ]
                            }
                        ]
                    }, { at: formContainer.get('components')?.length || 0 });
                    break;

                // Handle special economic fields
                case 'iban-select':
                    component = this.editor?.DomComponents.addComponent({
                        tagName: 'div',
                        attributes: { class: 'mb-3' },
                        components: [
                            {
                                tagName: 'label',
                                attributes: { class: 'form-label' },
                                content: comp.label || 'IBAN / Číslo účtu'
                            },
                            {
                                tagName: 'select',
                                attributes: {
                                    class: 'form-select',
                                    'data-gjs-type': 'select',
                                    name: comp.name || 'ibanId',
                                    ...(comp.required ? { required: true } : {})
                                },
                                type: 'select',
                                traits: [
                                    { type: 'text', name: 'name', value: comp.name || 'ibanId' },
                                    { type: 'text', name: 'displayName', value: comp.label || 'IBAN / Číslo účtu' },
                                    { type: 'checkbox', name: 'required', value: comp.required || false }
                                ],
                                components: [
                                    {
                                        tagName: 'option',
                                        attributes: { value: '' },
                                        content: 'Vyberte IBAN...'
                                    },
                                    {
                                        tagName: 'option',
                                        attributes: { value: '1' },
                                        content: 'SK1234567890123456789012'
                                    },
                                    {
                                        tagName: 'option',
                                        attributes: { value: '2' },
                                        content: 'SK9876543210987654321098'
                                    }
                                ]
                            }
                        ]
                    }, { at: formContainer.get('components')?.length || 0 });
                    break;

                case 'issue-date':
                    component = this.editor?.DomComponents.addComponent({
                        tagName: 'div',
                        attributes: { class: 'mb-3' },
                        components: [
                            {
                                tagName: 'label',
                                attributes: { class: 'form-label' },
                                content: comp.label || 'Dátum vystavenia'
                            },
                            {
                                tagName: 'input',
                                attributes: {
                                    type: 'date',
                                    class: 'form-control',
                                    'data-gjs-type': 'date-input',
                                    name: comp.name || 'issueDate',
                                    ...(comp.required ? { required: true } : {})
                                },
                                type: 'date-input',
                                traits: [
                                    { type: 'text', name: 'name', value: comp.name || 'issueDate' },
                                    { type: 'text', name: 'displayName', value: comp.label || 'Dátum vystavenia' },
                                    { type: 'checkbox', name: 'required', value: comp.required || false }
                                ]
                            }
                        ]
                    }, { at: formContainer.get('components')?.length || 0 });
                    break;

                case 'variable-symbol':
                    component = this.editor?.DomComponents.addComponent({
                        tagName: 'div',
                        attributes: { class: 'mb-3' },
                        components: [
                            {
                                tagName: 'label',
                                attributes: { class: 'form-label' },
                                content: comp.label || 'Variabilný symbol'
                            },
                            {
                                tagName: 'input',
                                attributes: {
                                    type: 'text',
                                    class: 'form-control',
                                    'data-gjs-type': 'text-input',
                                    name: comp.name || 'variableSymbol',
                                    ...(comp.required ? { required: true } : {})
                                },
                                type: 'text-input',
                                traits: [
                                    { type: 'text', name: 'name', value: comp.name || 'variableSymbol' },
                                    { type: 'text', name: 'displayName', value: comp.label || 'Variabilný symbol' },
                                    { type: 'checkbox', name: 'required', value: comp.required || false }
                                ]
                            }
                        ]
                    }, { at: formContainer.get('components')?.length || 0 });
                    break;

                case 'payment-method':
                    component = this.editor?.DomComponents.addComponent({
                        tagName: 'div',
                        attributes: { class: 'mb-3' },
                        components: [
                            {
                                tagName: 'label',
                                attributes: { class: 'form-label' },
                                content: comp.label || 'Spôsob úhrady'
                            },
                            {
                                tagName: 'select',
                                attributes: {
                                    class: 'form-select',
                                    'data-gjs-type': 'select',
                                    name: comp.name || 'paymentMethod',
                                    ...(comp.required ? { required: true } : {})
                                },
                                type: 'select',
                                traits: [
                                    { type: 'text', name: 'name', value: comp.name || 'paymentMethod' },
                                    { type: 'text', name: 'displayName', value: comp.label || 'Spôsob úhrady' },
                                    { type: 'checkbox', name: 'required', value: comp.required || false }
                                ],
                                components: [
                                    {
                                        tagName: 'option',
                                        attributes: { value: 'cash' },
                                        content: 'Hotovosť'
                                    },
                                    {
                                        tagName: 'option',
                                        attributes: { value: 'online' },
                                        content: 'Online platba'
                                    },
                                    {
                                        tagName: 'option',
                                        attributes: { value: 'cod' },
                                        content: 'Dobierka'
                                    }
                                ]
                            }
                        ]
                    }, { at: formContainer.get('components')?.length || 0 });
                    break;

                case 'due-date':
                    component = this.editor?.DomComponents.addComponent({
                        tagName: 'div',
                        attributes: { class: 'mb-3' },
                        components: [
                            {
                                tagName: 'label',
                                attributes: { class: 'form-label' },
                                content: comp.label || 'Splatnosť'
                            },
                            {
                                tagName: 'div',
                                attributes: { class: 'input-group' },
                                components: [
                                    {
                                        tagName: 'input',
                                        attributes: {
                                            type: 'number',
                                            class: 'form-control',
                                            placeholder: 'Dní',
                                            'data-gjs-type': 'due-date-days'
                                        }
                                    },
                                    {
                                        tagName: 'input',
                                        attributes: {
                                            type: 'date',
                                            class: 'form-control',
                                            'data-gjs-type': 'due-date-date'
                                        }
                                    }
                                ]
                            }
                        ],
                        type: 'due-date',
                        traits: [
                            { type: 'text', name: 'name', value: comp.name || 'dueDateInfo' },
                            { type: 'text', name: 'displayName', value: comp.label || 'Splatnosť' },
                            { type: 'number', name: 'defaultDays', value: 14 },
                            { type: 'checkbox', name: 'required', value: comp.required || false }
                        ]
                    }, { at: formContainer.get('components')?.length || 0 });
                    break;

                case 'currency-rate':
                    component = this.editor?.DomComponents.addComponent({
                        tagName: 'div',
                        attributes: { class: 'mb-3' },
                        components: [
                            {
                                tagName: 'label',
                                attributes: { class: 'form-label' },
                                content: comp.label || 'Mena / Kurz'
                            },
                            {
                                tagName: 'div',
                                attributes: { class: 'input-group' },
                                components: [
                                    {
                                        tagName: 'select',
                                        attributes: {
                                            class: 'form-select',
                                            style: 'flex: 0 0 auto; width: auto;',
                                            'data-gjs-type': 'currency-rate-currency'
                                        },
                                        components: [
                                            {
                                                tagName: 'option',
                                                attributes: { value: 'EUR' },
                                                content: 'EUR'
                                            },
                                            {
                                                tagName: 'option',
                                                attributes: { value: 'CZK' },
                                                content: 'CZK'
                                            },
                                            {
                                                tagName: 'option',
                                                attributes: { value: 'USD' },
                                                content: 'USD'
                                            }
                                        ]
                                    },
                                    {
                                        tagName: 'input',
                                        attributes: {
                                            type: 'number',
                                            class: 'form-control',
                                            value: '1.00',
                                            step: '0.01',
                                            'data-gjs-type': 'currency-rate-rate'
                                        }
                                    }
                                ]
                            }
                        ],
                        type: 'currency-rate',
                        traits: [
                            { type: 'text', name: 'name', value: comp.name || 'currencyRateInfo' },
                            { type: 'text', name: 'displayName', value: comp.label || 'Mena/Kurz' },
                            { type: 'select', name: 'defaultCurrency', value: 'EUR' },
                            { type: 'checkbox', name: 'required', value: comp.required || false }
                        ]
                    }, { at: formContainer.get('components')?.length || 0 });
                    break;

                default:
                    // For unrecognized types, default to text input
                    component = this.editor?.DomComponents.addComponent({
                        tagName: 'div',
                        attributes: { class: 'mb-3' },
                        components: [
                            {
                                tagName: 'label',
                                attributes: { class: 'form-label' },
                                content: comp.label
                            },
                            {
                                tagName: 'input',
                                attributes: {
                                    type: 'text',
                                    class: 'form-control',
                                    'data-gjs-type': 'text-input',
                                    name: comp.name,
                                    ...(comp.required ? { required: true } : {})
                                },
                                type: 'text-input',
                                traits: [
                                    { type: 'text', name: 'name', value: comp.name },
                                    { type: 'text', name: 'displayName', value: comp.label },
                                    { type: 'checkbox', name: 'required', value: comp.required || false }
                                ]
                            }
                        ]
                    }, { at: formContainer.get('components')?.length || 0 });
            }
        });
    }
}
