import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import { VehicleStore } from '../vehicle.store';
import { VehicleCardComponent } from './vehicle-card/vehicle-card.component';
import { LoadingSpinnerComponent } from '../../../shared/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-fleet-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [VehicleStore],
  imports: [AsyncPipe, FormsModule, VehicleCardComponent, LoadingSpinnerComponent],
  templateUrl: './fleet-overview.component.html',
  styleUrl: './fleet-overview.component.scss',
})
export class FleetOverviewComponent {
  private readonly store = inject(VehicleStore);
  private readonly router = inject(Router);

  private readonly searchTerm$ = new BehaviorSubject<string>('');

  readonly fleetCards$ = this.store.fleetCards$;
  readonly loading$ = this.store.fleetLoading$;
  readonly error$ = this.store.fleetError$;

  readonly filteredCards$ = combineLatest([
    this.fleetCards$,
    this.searchTerm$,
  ]).pipe(
    map(([cards, term]) => {
      if (!term.trim()) return cards;
      const needle = term.trim().toUpperCase();
      return cards.filter(c => c.vehicleId.toUpperCase().includes(needle));
    })
  );

  readonly suggestions$ = combineLatest([
    this.fleetCards$,
    this.searchTerm$,
  ]).pipe(
    map(([cards, term]) => {
      if (!term.trim()) return [];
      const needle = term.trim().toUpperCase();
      return cards
        .filter(c => c.vehicleId.toUpperCase().includes(needle))
        .map(c => c.vehicleId)
        .slice(0, 6);
    })
  );

  searchValue = '';
  showSuggestions = false;

  constructor() {
    this.store.loadFleetGrid();
  }

  onSearchInput(value: string): void {
    this.searchValue = value;
    this.searchTerm$.next(value);
    this.showSuggestions = value.trim().length > 0;
  }

  onSearchSubmit(event: Event): void {
    event.preventDefault();
    this.showSuggestions = false;
    (event.target as HTMLElement).blur();
  }

  onDismissSuggestions(): void {
    this.showSuggestions = false;
  }

  onSuggestionSelect(vehicleId: string): void {
    this.searchValue = vehicleId;
    this.searchTerm$.next(vehicleId);
    this.showSuggestions = false;
  }

  onSearchClear(): void {
    this.searchValue = '';
    this.searchTerm$.next('');
    this.showSuggestions = false;
  }

  onSearchBlur(): void {
    // Delay to allow click on suggestion to register
    setTimeout(() => { this.showSuggestions = false; }, 200);
  }

  onSearchFocus(): void {
    if (this.searchValue.trim()) {
      this.showSuggestions = true;
    }
  }

  onVehicleClick(vehicleId: string): void {
    this.router.navigate(['/vehicles', vehicleId]);
  }
}
