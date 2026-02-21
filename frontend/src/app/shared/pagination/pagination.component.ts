import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationComponent {
  @Input({ required: true }) total!: number;
  @Input({ required: true }) page!: number;
  @Input({ required: true }) limit!: number;
  @Output() pageChange = new EventEmitter<number>();

  get totalPages(): number {
    if (!this.limit || this.limit <= 0) return 1;
    return Math.ceil(this.total / this.limit);
  }

  get hasPrev(): boolean {
    return this.page > 1;
  }

  get hasNext(): boolean {
    return this.page < this.totalPages;
  }

  onPrev(): void {
    if (this.hasPrev) {
      this.pageChange.emit(this.page - 1);
    }
  }

  onNext(): void {
    if (this.hasNext) {
      this.pageChange.emit(this.page + 1);
    }
  }
}
