import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { VehicleStore } from '../vehicle.store';
import { SeverityBadgeComponent } from '../../../shared/severity-badge/severity-badge.component';
import { LoadingSpinnerComponent } from '../../../shared/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-vehicle-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [VehicleStore],
  imports: [AsyncPipe, DatePipe, RouterLink, SeverityBadgeComponent, LoadingSpinnerComponent],
  templateUrl: './vehicle-detail.component.html',
  styleUrl: './vehicle-detail.component.scss',
})
export class VehicleDetailComponent {
  private readonly store = inject(VehicleStore);
  private readonly route = inject(ActivatedRoute);

  readonly vehicleDetail$ = this.store.vehicleDetail$;
  readonly loading$ = this.store.detailLoading$;
  readonly error$ = this.store.detailError$;
  readonly healthStatus$ = this.store.detailHealthStatus$;

  readonly vehicleId$ = this.route.paramMap.pipe(
    map(params => params.get('id') ?? '')
  );

  constructor() {
    this.route.paramMap.pipe(
      map(params => params.get('id') ?? '')
    ).subscribe(vehicleId => {
      if (vehicleId) {
        this.store.loadVehicleDetail(vehicleId);
      }
    });
  }
}
