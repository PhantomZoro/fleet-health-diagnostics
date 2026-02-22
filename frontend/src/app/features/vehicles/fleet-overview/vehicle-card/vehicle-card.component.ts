import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import type { VehicleCard } from '../../../../core/models';

@Component({
  selector: 'app-vehicle-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './vehicle-card.component.html',
  styleUrl: './vehicle-card.component.scss',
})
export class VehicleCardComponent {
  @Input({ required: true }) vehicle!: VehicleCard;
  @Output() vehicleClick = new EventEmitter<string>();

  onCardClick(): void {
    this.vehicleClick.emit(this.vehicle.vehicleId);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.vehicleClick.emit(this.vehicle.vehicleId);
    }
  }
}
