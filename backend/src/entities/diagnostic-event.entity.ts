import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('diagnostic_events')
export class DiagnosticEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: 'datetime' })
  timestamp!: Date;

  @Index()
  @Column({ type: 'varchar', length: 10 })
  vehicleId!: string;

  @Index()
  @Column({ type: 'varchar', length: 5 })
  level!: string; // 'ERROR' | 'WARN' | 'INFO'

  @Index()
  @Column({ type: 'varchar', length: 10 })
  code!: string;

  @Column({ type: 'text' })
  message!: string;
}
