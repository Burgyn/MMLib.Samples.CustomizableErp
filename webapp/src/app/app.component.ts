import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SideMenuComponent } from './components/side-menu/side-menu.component';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, SideMenuComponent],
    template: `
        <div class="app-container">
            <header class="app-header">
                <div class="brand">
                    <i class="bi bi-box"></i>
                    <span class="ms-2">Super EShop</span>
                </div>
                <div class="header-actions">
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
        </div>
    `,
    styles: [`
        .app-container {
            height: 100vh;
            display: flex;
            flex-direction: column;
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
    `]
})
export class AppComponent {
    title = 'Customizable ERP';
}
