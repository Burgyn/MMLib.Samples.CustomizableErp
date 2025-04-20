export interface Category {
    id: string;
    name: string;
    icon?: string;
    order?: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface Evidence {
    id: string;
    name: string;
    description?: string;
    categoryId: string;
    icon?: string;
    order?: number;
    formDefinition: string; // GrapesJS JSON
    gridColumns: GridColumn[];
    subitemDefinitions?: SubitemDefinition[];
    references?: EvidenceReference[];
    createdAt: Date;
    updatedAt: Date;
    formRules?: FormRule[];
}

export interface SubitemDefinition {
    id: string;
    name: string;
    fieldName: string;
    columns: GridColumn[];
}

export interface GridColumn {
    field: string;
    headerName: string;
    type: string;
    width?: number;
    sortable?: boolean;
    filter?: boolean;
    isCalculated?: boolean;
    formula?: string;
    formulaFields?: string[];
}

export interface EvidenceRecord {
    id: string;
    evidenceId: string;
    documentNumber?: string;
    tags?: string[];
    data: any;
    subitems?: {[fieldName: string]: SubitemRecord[]};
    createdAt: Date;
    updatedAt: Date;
}

export interface SubitemRecord {
    id: string;
    parentRecordId: string;
    data: any;
    createdAt: Date;
    updatedAt: Date;
}

// Form rule system interfaces
export interface FormRule {
    id: string;
    name: string;
    conditions: RuleCondition[];
    actions: RuleAction[];
    active: boolean;
}

export interface RuleCondition {
    fieldName: string;
    operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty';
    value?: string | number | boolean;
}

export interface RuleAction {
    type: 'enable' | 'disable' | 'show' | 'hide' | 'setValue' | 'calculate';
    targetField: string;
    value?: string | number;
    formula?: string;
}

// Add new interface for evidence references
export interface EvidenceReference {
    id: string;
    name: string;
    targetEvidenceId: string;
    displayPattern: string; // Pattern like "{firstName} - {lastName}"
}
