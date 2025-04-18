import { Category, Evidence, EvidenceRecord } from '../models/evidence.model';
import { Observable, Subject, forkJoin, from, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import localforage from 'localforage';

// Define a more detailed interface for partners
interface PartnerDetails {
    id: string;
    name: string;
    address?: string;
    ico?: string;
    ic_dph?: string;
}

// Define export data interfaces
export interface ExportData {
    categories: Category[];
    evidences: Evidence[];
    recordsByEvidence: { [evidenceId: string]: EvidenceRecord[] };
    exportDate: string;
    version: string;
}

@Injectable({
    providedIn: 'root'
})
export class EvidenceService {
    private evidenceStore: LocalForage;
    private recordsStore: LocalForage;
    private categoryStore: LocalForage;

    // Subjects to notify when data changes
    private evidenceChanged = new Subject<void>();
    private categoryChanged = new Subject<void>();

    // Observables that components can subscribe to
    public evidenceChanged$ = this.evidenceChanged.asObservable();
    public categoryChanged$ = this.categoryChanged.asObservable();

    constructor() {
        this.evidenceStore = localforage.createInstance({
            name: 'customErp',
            storeName: 'evidences'
        });
        this.recordsStore = localforage.createInstance({
            name: 'customErp',
            storeName: 'records'
        });
        this.categoryStore = localforage.createInstance({
            name: 'customErp',
            storeName: 'categories'
        });
    }

    // Category CRUD operations
    getAllCategories(): Observable<Category[]> {
        return from(this.categoryStore.keys()).pipe(
            switchMap((keys: string[]) =>
                Promise.all(keys.map(key => this.categoryStore.getItem<Category>(key)))
            ),
            map(categories =>
                categories
                    .filter((c): c is Category => c !== null)
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
            )
        );
    }

    getCategory(id: string): Observable<Category | null> {
        return from(this.categoryStore.getItem<Category>(id));
    }

    saveCategory(category: Category): Observable<Category> {
        if (!category.id) {
            category.id = crypto.randomUUID();
        }
        if (!category.createdAt) {
            category.createdAt = new Date();
        }
        category.updatedAt = new Date();
        return from(this.categoryStore.setItem(category.id, category)).pipe(
            tap(() => {
                // Notify subscribers that a category has been updated
                this.categoryChanged.next();
            })
        );
    }

    deleteCategory(id: string): Observable<void> {
        return from(this.categoryStore.removeItem(id)).pipe(
            tap(() => {
                // Notify subscribers that a category has been deleted
                this.categoryChanged.next();
            })
        );
    }

    // Evidence CRUD operations
    getAllEvidences(): Observable<Evidence[]> {
        return from(this.evidenceStore.keys()).pipe(
            switchMap((keys: string[]) =>
                Promise.all(keys.map(key => this.evidenceStore.getItem<Evidence>(key)))
            ),
            map(evidences =>
                evidences
                    .filter((e): e is Evidence => e !== null)
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
            )
        );
    }

    getEvidencesByCategory(categoryId: string): Observable<Evidence[]> {
        return this.getAllEvidences().pipe(
            map(evidences =>
                evidences
                    .filter(e => e.categoryId === categoryId)
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
            )
        );
    }

    getEvidence(id: string): Observable<Evidence | null> {
        return from(this.evidenceStore.getItem<Evidence>(id));
    }

    saveEvidence(evidence: Evidence): Observable<Evidence> {
        if (!evidence.id) {
            evidence.id = crypto.randomUUID();
        }
        if (!evidence.createdAt) {
            evidence.createdAt = new Date();
        }
        evidence.updatedAt = new Date();
        return from(this.evidenceStore.setItem(evidence.id, evidence)).pipe(
            tap(() => {
                // Notify subscribers that an evidence has been updated
                this.evidenceChanged.next();
            })
        );
    }

    deleteEvidence(id: string): Observable<void> {
        return from(this.evidenceStore.removeItem(id)).pipe(
            tap(() => {
                // Notify subscribers that an evidence has been deleted
                this.evidenceChanged.next();
            })
        );
    }

    // Records CRUD operations
    getRecords(evidenceId: string): Observable<EvidenceRecord[]> {
        return from(this.recordsStore.keys()).pipe(
            map((keys: string[]) => keys.filter(key => key.startsWith(`${evidenceId}::`))),
            switchMap((keys: string[]) =>
                Promise.all(keys.map(key => this.recordsStore.getItem<EvidenceRecord>(key)))
            ),
            map(records => records.filter((r): r is EvidenceRecord => r !== null))
        );
    }

    getRecord(evidenceId: string, recordId: string): Observable<EvidenceRecord | null> {
        return from(this.recordsStore.getItem<EvidenceRecord>(`${evidenceId}::${recordId}`));
    }

    saveRecord(evidenceId: string, record: EvidenceRecord): Observable<EvidenceRecord> {
        if (!record.id) {
            record.id = crypto.randomUUID();
        }
        if (!record.createdAt) {
            record.createdAt = new Date();
        }
        record.evidenceId = evidenceId;
        record.updatedAt = new Date();
        return from(this.recordsStore.setItem(`${evidenceId}::${record.id}`, record));
    }

    deleteRecord(evidenceId: string, recordId: string): Observable<void> {
        return from(this.recordsStore.removeItem(`${evidenceId}::${recordId}`));
    }

    // --- Export/Import Functionality ---

    /**
     * Exports all evidences and their records
     */
    exportAllData(): Observable<{
        evidences: Evidence[];
        recordsByEvidence: { [evidenceId: string]: EvidenceRecord[] };
    }> {
        return this.getAllEvidences().pipe(
            switchMap(evidences => {
                // Create an observable for each evidence's records
                const recordObservables = evidences.map(evidence =>
                    this.getRecords(evidence.id).pipe(
                        map(records => ({ evidenceId: evidence.id, records }))
                    )
                );

                // Combine all record observables
                return forkJoin(recordObservables).pipe(
                    map(recordResults => {
                        // Create a map of evidenceId -> records[]
                        const recordsByEvidence: { [evidenceId: string]: EvidenceRecord[] } = {};
                        recordResults.forEach(result => {
                            recordsByEvidence[result.evidenceId] = result.records;
                        });

                        return {
                            evidences,
                            recordsByEvidence
                        };
                    })
                );
            })
        );
    }

    /**
     * Imports all evidences and their records from export data
     */
    importAllData(importData: ExportData): Observable<void> {
        // First, import all categories
        const categoryImports = importData.categories.map(category =>
            this.saveCategory(category)
        );

        // Then, import all evidences
        const evidenceImports = importData.evidences.map(evidence =>
            this.saveEvidence(evidence)
        );

        // Finally, import all records
        const recordImports: Observable<EvidenceRecord>[] = [];
        Object.entries(importData.recordsByEvidence).forEach(([evidenceId, records]) => {
            records.forEach(record => {
                // Make sure the record has the correct evidenceId
                record.evidenceId = evidenceId;
                recordImports.push(this.saveRecord(evidenceId, record));
            });
        });

        // Combine all imports into a single observable
        return forkJoin([
            ...categoryImports,
            ...evidenceImports,
            ...recordImports
        ]).pipe(
            map(() => {
                // Notify subscribers that data has changed
                this.categoryChanged.next();
                this.evidenceChanged.next();

                // Return void
                return;
            })
        );
    }

    // --- Dummy Data for Selectors ---

    getPartners(): Observable<PartnerDetails[]> {
        // Simulate API call with mock data including details
        const mockPartners: PartnerDetails[] = [
            {
                id: 'p1',
                name: 'Peter Ucháľ - PETER',
                address: 'Tureň 373, 903 01 Tureň, Slovenská republika',
                ico: '37522451',
                ic_dph: 'SK1024607628'
            },
            {
                id: 'p2',
                name: 'Burgyn s.r.o.',
                address: 'Hlavná 1, 811 01 Bratislava',
                ico: '12345678',
                ic_dph: 'SK12345678'
            },
            {
                id: 'p3',
                name: 'Dodávateľ XYZ, a.s.',
                address: 'Priemyselná 5, 010 01 Žilina',
                ico: '87654321',
                ic_dph: 'SK87654321'
            },
            {
                id: 'p4',
                name: 'Iný Partner, s.r.o.',
                address: 'Námestie Slobody 10, 974 01 Banská Bystrica',
                ico: '11223344'
                // ic_dph might be missing for some partners
            }
        ];
        return of(mockPartners);
    }

    getIbans(): Observable<{ id: string; value: string }[]> {
        // Simulate API call with mock data
        const mockIbans = [
            { id: 'iban1', value: 'SK99 0900 0000 0012 3456 7890' },
            { id: 'iban2', value: 'SK88 0200 0000 0098 7654 3210' },
            { id: 'iban3', value: 'SK77 1100 0000 0011 2233 4455' }
        ];
        return of(mockIbans);
    }
}
