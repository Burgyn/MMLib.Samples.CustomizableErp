import { Category, Evidence, EvidenceRecord } from '../models/evidence.model';
import { Observable, from, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import localforage from 'localforage';

@Injectable({
    providedIn: 'root'
})
export class EvidenceService {
    private evidenceStore: LocalForage;
    private recordsStore: LocalForage;
    private categoryStore: LocalForage;

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
        return from(this.categoryStore.setItem(category.id, category));
    }

    deleteCategory(id: string): Observable<void> {
        return from(this.categoryStore.removeItem(id));
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
        return from(this.evidenceStore.setItem(evidence.id, evidence));
    }

    deleteEvidence(id: string): Observable<void> {
        return from(this.evidenceStore.removeItem(id));
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

    // --- Dummy Data for Selectors ---

    getPartners(): Observable<{ id: string; name: string }[]> {
        // Simulate API call with mock data
        const mockPartners = [
            { id: 'p1', name: 'Peter Ucháľ - PETER' },
            { id: 'p2', name: 'Burgyn s.r.o.' },
            { id: 'p3', name: 'Dodávateľ XYZ, a.s.' },
            { id: 'p4', name: 'Iný Partner, s.r.o.' }
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
