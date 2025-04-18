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
    createdAt: Date;
    updatedAt: Date;
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
