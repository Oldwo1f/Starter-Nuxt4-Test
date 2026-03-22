import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('launch_mode_config')
export class LaunchModeConfig {
  @PrimaryColumn({ type: 'int', default: 1 })
  id: number;

  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  @Column({ type: 'jsonb', default: [] })
  allowedIps: string[];

  @Column({ type: 'timestamptz' })
  launchOpensAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
