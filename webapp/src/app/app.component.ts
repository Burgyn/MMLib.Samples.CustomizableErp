import { Category, Evidence, EvidenceRecord } from './models/evidence.model';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { EvidenceService, ExportData } from './services/evidence.service';

import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SideMenuComponent } from './components/side-menu/side-menu.component';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, SideMenuComponent, CommonModule],
    template: `
        <div class="app-container">
            <header class="app-header">
                <div class="brand">
                    <i class="bi bi-box"></i>
                    <span class="ms-2">Super EShop</span>
                </div>
                <div class="header-actions">
                    <!-- Export/Import buttons -->
                    <button class="btn btn-link" (click)="exportAllData()" title="Exportovať všetky dáta">
                        <i class="bi bi-download"></i>
                    </button>
                    <button class="btn btn-link" (click)="triggerImport()" title="Importovať dáta">
                        <i class="bi bi-upload"></i>
                    </button>
                    <input type="file" #importFileInput style="display: none" accept=".json" (change)="importAllData($event)">

                    <!-- Help and Settings -->
                    <button class="btn btn-link">
                        <i class="bi bi-question-circle"></i>
                    </button>
                    <button class="btn btn-link">
                        <i class="bi bi-gear"></i>
                    </button>
                </div>
            </header>
            <div class="app-content">
                <app-side-menu></app-side-menu>
                <main class="main-content">
                    <router-outlet></router-outlet>
                </main>
            </div>

            <!-- Loading Overlay -->
            <div class="loading-overlay" *ngIf="isLoading">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Načítavam...</span>
                </div>
                <div class="mt-2">{{ loadingMessage }}</div>
            </div>
        </div>
    `,
    styles: [`
        .app-container {
            height: 100vh;
            display: flex;
            flex-direction: column;
            position: relative;
        }

        .app-header {
            height: 56px;
            background: #fff;
            border-bottom: 1px solid #dee2e6;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 1rem;
        }

        .brand {
            display: flex;
            align-items: center;
            font-size: 1.25rem;
            font-weight: 500;
            color: #495057;
        }

        .header-actions {
            display: flex;
            gap: 0.5rem;
        }

        .header-actions .btn-link {
            color: #6c757d;
            font-size: 1.25rem;
            padding: 0.25rem;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.15s ease-in-out;
        }

        .header-actions .btn-link:hover {
            color: #495057;
        }

        .app-content {
            flex: 1;
            display: flex;
            overflow: hidden;
        }

        .main-content {
            flex: 1;
            overflow: auto;
            background: #fff;
        }

        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(255, 255, 255, 0.8);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        }
    `]
})
export class AppComponent {
    @ViewChild('importFileInput') importFileInput!: ElementRef<HTMLInputElement>;
    title = 'Customizable ERP';
    isLoading = false;
    loadingMessage = 'Prosím čakajte...';

    constructor(private evidenceService: EvidenceService) {}

    /**
     * Exports all application data (evidences and records)
     */
    exportAllData(): void {
        this.isLoading = true;
        this.loadingMessage = 'Exportujem dáta...';

        try {
            // Get all categories
            this.evidenceService.getAllCategories().subscribe(categories => {
                // Get all evidences and records using the exportAllData method
                this.evidenceService.exportAllData().subscribe(
                    data => {
                        // Create export object using the ExportData interface
                        const exportData: ExportData = {
                            categories: categories,
                            evidences: data.evidences,
                            recordsByEvidence: data.recordsByEvidence,
                            exportDate: new Date().toISOString(),
                            version: '1.0'
                        };

                        // Convert to JSON
                        const jsonData = JSON.stringify(exportData, null, 2);

                        // Create blob and download link
                        const blob = new Blob([jsonData], { type: 'application/json' });
                        const url = window.URL.createObjectURL(blob);

                        // Create temporary link and trigger download
                        const a = document.createElement('a');
                        a.href = url;

                        // Format filename with date
                        const date = new Date();
                        const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
                        a.download = `erp-export-${dateStr}.json`;
                        document.body.appendChild(a);
                        a.click();

                        // Cleanup
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);

                        this.isLoading = false;

                        // Show success message
                        const totalRecords = Object.values(data.recordsByEvidence).reduce(
                            (sum, records) => sum + records.length, 0
                        );
                        alert(`Export dokončený: ${data.evidences.length} evidencií, ${totalRecords} záznamov.`);
                    },
                    error => {
                        console.error('Error exporting data:', error);
                        this.isLoading = false;
                        alert('Nastala chyba pri exporte dát.');
                    }
                );
            });
        } catch (error) {
            console.error('Error in export process:', error);
            this.isLoading = false;
            alert('Nastala chyba pri exporte dát.');
        }
    }

    /**
     * Triggers the file input for importing data
     */
    triggerImport(): void {
        this.importFileInput.nativeElement.click();
    }

    /**
     * Imports all application data from a JSON file
     */
    importAllData(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) {
            return;
        }

        const file = input.files[0];
        const reader = new FileReader();

        reader.onload = (e: ProgressEvent<FileReader>) => {
            try {
                const jsonData = e.target?.result as string;
                const importData = JSON.parse(jsonData) as ExportData;

                // Basic validation
                if (!importData.evidences || !importData.recordsByEvidence || !importData.categories) {
                    throw new Error('Neplatný formát importovaného súboru.');
                }

                // Confirm import
                const message = `Naozaj chcete importovať ${importData.categories.length} kategórií, ${importData.evidences.length} evidencií a ich záznamy? Existujúce dáta zostanú zachované.`;
                const confirmImport = confirm(message);

                if (!confirmImport) {
                    input.value = '';
                    return;
                }

                // Show loading state
                this.isLoading = true;
                this.loadingMessage = 'Importujem dáta...';

                // Use the importAllData method from EvidenceService
                this.evidenceService.importAllData(importData).subscribe(
                    () => {
                        this.isLoading = false;
                        alert('Import bol úspešne dokončený. Obnovte stránku pre zobrazenie importovaných dát.');
                        input.value = '';
                    },
                    error => {
                        console.error('Error importing data:', error);
                        this.isLoading = false;
                        alert('Nastala chyba pri importe dát.');
                        input.value = '';
                    }
                );
            } catch (error) {
                console.error('Error parsing import file:', error);
                alert('Nastala chyba pri importe dát. Uistite sa, že súbor je v správnom formáte.');
                input.value = '';
            }
        };

        reader.onerror = () => {
            alert('Nastala chyba pri čítaní súboru.');
            input.value = '';
        };

        reader.readAsText(file);
    }
}
