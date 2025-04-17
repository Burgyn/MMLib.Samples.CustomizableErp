import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';

import { CommonModule } from '@angular/common';
import { Evidence } from '../../models/evidence.model';
import { EvidenceService } from '../../services/evidence.service';

@Component({
    selector: 'app-evidence-list',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="toolbar-section">
            <button class="btn btn-primary btn-sm me-2" (click)="createNewEvidence()">
                <i class="bi bi-plus"></i> New Evidence
            </button>
            <div class="btn-group">
                <button *ngFor="let evidence of evidences"
                        class="btn btn-outline-secondary btn-sm"
                        [class.active]="isActive(evidence)"
                        (click)="openEvidence(evidence)">
                    {{ evidence.name }}
                </button>
            </div>
        </div>
    `,
    styles: [`
        .toolbar-section {
            display: flex;
            align-items: center;
            padding: 0.5rem;
            background-color: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
        }
        .btn-group {
            display: flex;
            overflow-x: auto;
            max-width: calc(100% - 120px);
        }
        .btn-group::-webkit-scrollbar {
            height: 4px;
        }
        .btn-group::-webkit-scrollbar-thumb {
            background-color: #dee2e6;
        }
    `]
})
export class EvidenceListComponent implements OnInit, OnDestroy {
    evidences: Evidence[] = [];
    private routerSubscription?: Subscription;

    constructor(
        private evidenceService: EvidenceService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.loadEvidences();

        // Refresh the list when navigation ends
        this.routerSubscription = this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe(() => {
            this.loadEvidences();
        });
    }

    ngOnDestroy(): void {
        this.routerSubscription?.unsubscribe();
    }

    private loadEvidences(): void {
        this.evidenceService.getAllEvidences()
            .subscribe(evidences => this.evidences = evidences);
    }

    createNewEvidence(): void {
        this.router.navigate(['/evidence/new']);
    }

    openEvidence(evidence: Evidence): void {
        this.router.navigate(['/evidence', evidence.id]);
    }

    isActive(evidence: Evidence): boolean {
        return this.router.url.includes(`/evidence/${evidence.id}`);
    }
}
