import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';
import { VehicleStore } from '../vehicle.store';
import { VehicleCardComponent } from './vehicle-card/vehicle-card.component';
import { LoadingSpinnerComponent } from '../../../shared/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-fleet-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [VehicleStore],
  imports: [AsyncPipe, VehicleCardComponent, LoadingSpinnerComponent],
  templateUrl: './fleet-overview.component.html',
  styleUrl: './fleet-overview.component.scss',
})
export class FleetOverviewComponent {
  private readonly store = inject(VehicleStore);
  private readonly router = inject(Router);

  readonly fleetCards$ = this.store.fleetCards$;
  readonly loading$ = this.store.fleetLoading$;
  readonly error$ = this.store.fleetError$;

  constructor() {
    this.store.loadFleetGrid();
  }

  onVehicleClick(vehicleId: string): void {
    this.router.navigate(['/vehicles', vehicleId]);
  }
}
