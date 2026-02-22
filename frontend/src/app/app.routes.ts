import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'vehicles',
    loadComponent: () => import('./features/vehicles/fleet-overview/fleet-overview.component').then(m => m.FleetOverviewComponent)
  },
  {
    path: 'vehicles/:id',
    loadComponent: () => import('./features/vehicles/vehicle-detail/vehicle-detail.component').then(m => m.VehicleDetailComponent)
  },
  {
    path: 'events',
    loadComponent: () => import('./features/events/events.component').then(m => m.EventsComponent)
  }
];
