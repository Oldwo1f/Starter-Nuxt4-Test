import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { DateTime } from 'luxon';
import { LaunchModeConfig } from '../entities/launch-mode-config.entity';
import { UserRole } from '../entities/user.entity';
import { UpdateLaunchModeDto } from './dto/update-launch-mode.dto';

const STAFF_ROLES = new Set(
  [UserRole.MODERATOR, UserRole.ADMIN, UserRole.SUPERADMIN].map((r) =>
    r.toLowerCase(),
  ),
);

@Injectable()
export class LaunchModeService {
  constructor(
    @InjectRepository(LaunchModeConfig)
    private readonly repo: Repository<LaunchModeConfig>,
    private readonly jwtService: JwtService,
  ) {}

  /** Prochain dimanche 20:30 heure de Tahiti (strictement dans le futur). */
  private defaultOpensAt(): Date {
    const zone = 'Pacific/Tahiti';
    const dt = DateTime.now().setZone(zone);
    let target = dt.set({
      weekday: 7,
      hour: 20,
      minute: 30,
      second: 0,
      millisecond: 0,
    });
    if (dt >= target) {
      target = target.plus({ weeks: 1 });
    }
    return target.toUTC().toJSDate();
  }

  async getConfig(): Promise<LaunchModeConfig> {
    let row = await this.repo.findOne({ where: { id: 1 } });
    if (!row) {
      row = this.repo.create({
        id: 1,
        enabled: false,
        allowedIps: [],
        launchOpensAt: this.defaultOpensAt(),
      });
      await this.repo.save(row);
    }
    return row;
  }

  getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      const first = forwarded.split(',')[0]?.trim();
      if (first) return first;
    }
    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string' && realIp.trim()) {
      return realIp.trim();
    }
    return req.ip || '';
  }

  private normalizeAllowedIps(ips: string[]): string[] {
    return [...new Set(ips.map((ip) => ip.trim()).filter(Boolean))];
  }

  private isIpAllowed(clientIp: string, allowedIps: string[]): boolean {
    if (!clientIp) return false;
    const normalized = clientIp.replace(/^::ffff:/, '');
    return allowedIps.some((allowed) => {
      const a = allowed.replace(/^::ffff:/, '');
      return a === normalized || a === clientIp;
    });
  }

  private isPastOpensAt(launchOpensAt: Date): boolean {
    return Date.now() >= new Date(launchOpensAt).getTime();
  }

  async getPublicStatus(): Promise<{
    enabled: boolean;
    launchOpensAt: string;
  }> {
    const c = await this.getConfig();
    return {
      enabled: c.enabled,
      launchOpensAt: new Date(c.launchOpensAt).toISOString(),
    };
  }

  private staffFromBearer(req: Request): boolean {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return false;
    }
    const token = auth.slice(7).trim();
    if (!token) return false;
    try {
      const payload = this.jwtService.verify<{ role?: string }>(token);
      const role = payload.role?.toLowerCase();
      return role ? STAFF_ROLES.has(role) : false;
    } catch {
      return false;
    }
  }

  async checkAccess(req: Request): Promise<{ allowed: boolean }> {
    const c = await this.getConfig();
    if (!c.enabled || this.isPastOpensAt(c.launchOpensAt)) {
      return { allowed: true };
    }
    if (this.staffFromBearer(req)) {
      return { allowed: true };
    }
    const ip = this.getClientIp(req);
    if (this.isIpAllowed(ip, c.allowedIps)) {
      return { allowed: true };
    }
    return { allowed: false };
  }

  async getAdminConfig(): Promise<LaunchModeConfig> {
    return this.getConfig();
  }

  async updateAdminConfig(dto: UpdateLaunchModeDto): Promise<LaunchModeConfig> {
    const c = await this.getConfig();
    if (dto.enabled !== undefined) {
      c.enabled = dto.enabled;
    }
    if (dto.allowedIps !== undefined) {
      c.allowedIps = this.normalizeAllowedIps(dto.allowedIps);
    }
    if (dto.launchOpensAt !== undefined) {
      c.launchOpensAt = new Date(dto.launchOpensAt);
    }
    return this.repo.save(c);
  }
}
