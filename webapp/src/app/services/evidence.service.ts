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
}
