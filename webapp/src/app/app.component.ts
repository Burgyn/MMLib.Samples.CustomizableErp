import { Category, Evidence, EvidenceRecord } from './models/evidence.model';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { EvidenceService, ExportData } from './services/evidence.service';

import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SideMenuComponent } from './components/side-menu/side-menu.component';
import { ThemeService } from './services/theme.service';

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
                    <!-- Theme selector -->
                    <div class="theme-selector">
                        <button class="btn btn-link theme-toggle" (click)="toggleThemeMenu()" [title]="'Zmeniť tému'">
                            <i *ngIf="currentTheme === 'light'" class="bi bi-sun-fill"></i>
                            <i *ngIf="currentTheme === 'dark'" class="bi bi-moon-fill"></i>
                            <i *ngIf="currentTheme === 'dark-blue'" class="bi bi-moon-stars-fill"></i>
                            <i *ngIf="currentTheme === 'dark-green'" class="bi bi-tree-fill"></i>
                        </button>
                        <div class="theme-menu" *ngIf="isThemeMenuOpen">
                            <button class="theme-item" (click)="switchTheme('light')">
                                <i class="bi bi-sun-fill"></i> Svetlá téma
                            </button>
                            <button class="theme-item" (click)="switchTheme('dark')">
                                <i class="bi bi-moon-fill"></i> Tmavá téma
                            </button>
                            <button class="theme-item" (click)="switchTheme('dark-blue')">
                                <i class="bi bi-moon-stars-fill"></i> Tmavá modrá téma
                            </button>
                            <button class="theme-item" (click)="switchTheme('dark-green')">
                                <i class="bi bi-tree-fill"></i> Tmavá zelená téma
                            </button>
                        </div>
                    </div>

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
            background: var(--header-bg);
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 1rem;
            transition: background-color 0.3s ease;
        }

        .brand {
            display: flex;
            align-items: center;
            font-size: 1.25rem;
            font-weight: 500;
            color: var(--text-color);
            transition: color 0.3s ease;
        }

        .header-actions {
            display: flex;
            gap: 0.5rem;
        }

        .header-actions .btn-link {
            color: var(--text-muted);
            font-size: 1.25rem;
            padding: 0.25rem;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.15s ease-in-out;
        }

        .header-actions .btn-link:hover {
            color: var(--text-color);
        }

        .app-content {
            flex: 1;
            display: flex;
            overflow: hidden;
        }

        .main-content {
            flex: 1;
            overflow: auto;
            background: var(--component-bg);
            transition: background-color 0.3s ease;
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

        .dark-theme .loading-overlay,
        .dark-blue-theme .loading-overlay,
        .dark-purple-theme .loading-overlay,
        .dark-green-theme .loading-overlay,
        .dark-orange-theme .loading-overlay {
            background-color: rgba(0, 0, 0, 0.6);
        }

        /* Theme selector styles */
        .theme-selector {
            position: relative;
        }

        .theme-menu {
            position: absolute;
            top: 100%;
            right: 0;
            width: 220px;
            background-color: var(--component-bg);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
            z-index: 1000;
            padding: 0.5rem 0;
            margin-top: 0.25rem;
        }

        .theme-item {
            display: flex;
            align-items: center;
            padding: 0.5rem 1rem;
            width: 100%;
            text-align: left;
            background: none;
            border: none;
            color: var(--text-color);
            transition: background-color 0.15s ease;
            cursor: pointer;
        }

        .theme-item:hover {
            background-color: var(--light-color);
        }

        .theme-item i {
            margin-right: 0.5rem;
            color: var(--primary-color);
        }
    `]
})
export class AppComponent implements OnInit {
    @ViewChild('importFileInput') importFileInput!: ElementRef<HTMLInputElement>;
    title = 'Customizable ERP';
    isLoading = false;
    loadingMessage = 'Prosím čakajte...';
    currentTheme = 'light';
    isThemeMenuOpen = false;

    constructor(
        private evidenceService: EvidenceService,
        private themeService: ThemeService
    ) {}

    ngOnInit(): void {
        // Subscribe na zmeny témy
        this.themeService.currentTheme$.subscribe(theme => {
            this.currentTheme = theme;
        });

        // Zatvorí menu pri kliknutí mimo neho
        document.addEventListener('click', (event) => {
            if (this.isThemeMenuOpen && !event.composedPath().some(el => el instanceof HTMLElement && el.classList.contains('theme-selector'))) {
                this.isThemeMenuOpen = false;
            }
        });

        // Zatvorí menu pri stlačení klávesy Escape
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isThemeMenuOpen) {
                this.isThemeMenuOpen = false;
            }
        });
    }

    /**
     * Prepína zobrazenie menu témy
     */
    toggleThemeMenu(): void {
        this.isThemeMenuOpen = !this.isThemeMenuOpen;
    }

    /**
     * Nastaví konkrétnu tému
     */
    switchTheme(theme: 'light' | 'dark' | 'dark-blue' | 'dark-purple' | 'dark-green' | 'dark-orange' | 'soft-dark'): void {
        this.themeService.switchToTheme(theme);
        this.isThemeMenuOpen = false;
    }

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
