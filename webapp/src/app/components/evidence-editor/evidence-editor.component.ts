import { ActivatedRoute, Router } from '@angular/router';
import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Editor, Component as GrapesComponent } from 'grapesjs';
import { Evidence, GridColumn } from '../../models/evidence.model';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { CommonModule } from '@angular/common';
import { EvidenceService } from '../../services/evidence.service';
import grapesjs from 'grapesjs';

@Component({
    selector: 'app-evidence-editor',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    template: `
        <div class="editor-container">
            <div class="toolbar">
                <form [formGroup]="evidenceForm" class="d-flex gap-3 align-items-center">
                    <div class="form-group">
                        <input type="text"
                               class="form-control"
                               formControlName="name"
                               placeholder="Evidence Name">
                    </div>
                    <div class="form-group">
                        <input type="text"
                               class="form-control"
                               formControlName="description"
                               placeholder="Description">
                    </div>
                    <button class="btn btn-primary"
                            (click)="saveEvidence()"
                            [disabled]="!evidenceForm.valid">
                        Save Evidence
                    </button>
                </form>
            </div>
            <div id="gjs" class="editor-canvas"></div>
        </div>
    `,
    styles: [`
        .editor-container {
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        .toolbar {
            padding: 1rem;
            background-color: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
        }
        .editor-canvas {
            flex: 1;
            position: relative;
        }
        :host ::ng-deep .gjs-one-bg {
            background-color: #f8f9fa;
        }
        :host ::ng-deep .gjs-two-color {
            color: #333;
        }
    `],
    encapsulation: ViewEncapsulation.None
})
export class EvidenceEditorComponent implements OnInit, OnDestroy {
    private editor: Editor | null = null;
    evidenceForm: FormGroup;
    private evidenceId: string | null = null;

    constructor(
        private fb: FormBuilder,
        private evidenceService: EvidenceService,
        private route: ActivatedRoute,
        private router: Router
    ) {
        this.evidenceForm = this.fb.group({
            name: ['', Validators.required],
            description: ['']
        });
    }

    ngOnInit(): void {
        this.initializeEditor();
        this.route.params.subscribe(params => {
            if (params['id'] && params['id'] !== 'new') {
                this.evidenceId = params['id'];
                if (this.evidenceId) {
                    this.loadEvidence(this.evidenceId);
                }
            }
        });
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
            plugins: [],
            blockManager: {
                blocks: [
                    {
                        id: 'text-input',
                        label: 'Text Input',
                        content: `<div class="mb-3">
                            <label class="form-label">Text Field</label>
                            <input type="text" class="form-control" data-gjs-type="text-input"/>
                        </div>`
                    },
                    {
                        id: 'number-input',
                        label: 'Number Input',
                        content: `<div class="mb-3">
                            <label class="form-label">Number Field</label>
                            <input type="number" class="form-control" data-gjs-type="number-input"/>
                        </div>`
                    },
                    {
                        id: 'date-input',
                        label: 'Date Input',
                        content: `<div class="mb-3">
                            <label class="form-label">Date Field</label>
                            <input type="date" class="form-control" data-gjs-type="date-input"/>
                        </div>`
                    },
                    {
                        id: 'select',
                        label: 'Select',
                        content: `<div class="mb-3">
                            <label class="form-label">Select Field</label>
                            <select class="form-select" data-gjs-type="select">
                                <option value="">Select an option</option>
                            </select>
                        </div>`
                    },
                    {
                        id: 'textarea',
                        label: 'Text Area',
                        content: `<div class="mb-3">
                            <label class="form-label">Text Area</label>
                            <textarea class="form-control" data-gjs-type="textarea"></textarea>
                        </div>`
                    }
                ]
            },
            canvas: {
                styles: [
                    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css'
                ]
            }
        });

        // Add custom traits for form elements
        this.editor.DomComponents.addType('text-input', {
            isComponent: (el) => el.getAttribute && el.getAttribute('data-gjs-type') === 'text-input',
            model: {
                defaults: {
                    traits: [
                        'name',
                        'placeholder',
                        'required'
                    ]
                }
            }
        });
    }

    private loadEvidence(id: string): void {
        this.evidenceService.getEvidence(id).subscribe(evidence => {
            if (evidence) {
                this.evidenceForm.patchValue({
                    name: evidence.name,
                    description: evidence.description
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
            description: this.evidenceForm.value.description,
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

        const components = wrapper.find('input, select, textarea');

        components.forEach((component: GrapesComponent, index: number) => {
            const traits = component.get('traits');
            const name = traits?.where({ name: 'name' })[0]?.get('value') || `field_${index}`;
            const type = component.get('type') || 'string';

            columns.push({
                field: name,
                headerName: traits?.where({ name: 'label' })[0]?.get('value') || name,
                type: this.getColumnType(type),
                sortable: true,
                filter: true
            });
        });

        return columns;
    }

    private getColumnType(componentType: string): string {
        switch (componentType) {
            case 'number-input':
                return 'number';
            case 'date-input':
                return 'date';
            default:
                return 'string';
        }
    }
}
