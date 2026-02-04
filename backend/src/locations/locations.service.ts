import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from '../entities/location.entity';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
  ) {}

  async findAll(): Promise<Location[]> {
    return this.locationRepository.find({
      order: {
        archipel: 'ASC',
        commune: 'ASC',
        ile: 'ASC',
      },
    });
  }

  async findOne(id: number): Promise<Location> {
    const location = await this.locationRepository.findOne({
      where: { id },
    });
    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }
    return location;
  }

  async findByArchipel(archipel: string): Promise<Location[]> {
    return this.locationRepository.find({
      where: { archipel },
      order: {
        commune: 'ASC',
        ile: 'ASC',
      },
    });
  }

  async getHierarchy(): Promise<any> {
    const locations = await this.findAll();
    
    // Organiser en hiérarchie : archipel -> commune -> îles
    const hierarchy: any = {};
    
    for (const location of locations) {
      if (!hierarchy[location.archipel]) {
        hierarchy[location.archipel] = {};
      }
      if (!hierarchy[location.archipel][location.commune]) {
        hierarchy[location.archipel][location.commune] = [];
      }
      if (!hierarchy[location.archipel][location.commune].includes(location.ile)) {
        hierarchy[location.archipel][location.commune].push(location.ile);
      }
    }
    
    // Convertir en format array pour faciliter le frontend
    const result = Object.keys(hierarchy).map(archipel => ({
      archipel,
      communes: Object.keys(hierarchy[archipel]).map(commune => ({
        commune,
        iles: hierarchy[archipel][commune],
      })),
    }));
    
    return result;
  }
}
