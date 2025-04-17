import { Component } from '@angular/core';
import { EvidenceListComponent } from './components/evidence-list/evidence-list.component';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, EvidenceListComponent],
    template: `
        <div class="app-container">
            <app-evidence-list></app-evidence-list>
            <div class="content-container">
                <router-outlet></router-outlet>
            </div>
        </div>
    `,
    styles: [`
        .app-container {
            display: flex;
            flex-direction: column;
            height: 100vh;
            overflow: hidden;
        }
        .content-container {
            flex: 1;
            overflow: auto;
        }
    `]
})
export class AppComponent {
    title = 'Customizable ERP';
}
