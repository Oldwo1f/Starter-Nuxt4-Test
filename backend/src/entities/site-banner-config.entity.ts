import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('site_banner_config')
export class SiteBannerConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', nullable: true })
  desktopImageUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  mobileImageUrl: string | null;

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}

