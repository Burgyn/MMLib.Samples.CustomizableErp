import { EvidenceEditorComponent } from './components/evidence-editor/evidence-editor.component';
import { EvidenceViewComponent } from './components/evidence-view/evidence-view.component';
import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: '', redirectTo: '/evidence', pathMatch: 'full' },
    { path: 'evidence', component: EvidenceViewComponent },
    { path: 'evidence/new', component: EvidenceEditorComponent },
    { path: 'evidence/:id', component: EvidenceViewComponent },
    { path: 'evidence/:id/edit', component: EvidenceEditorComponent },
    {
        path: 'settings/rbac',
        loadChildren: () => import('./components/rbac-management/rbac-management.module').then(m => m.RbacManagementModule)
    }
];
