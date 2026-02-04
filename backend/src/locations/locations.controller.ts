import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { LocationsService } from './locations.service';
import { Location } from '../entities/location.entity';

@ApiTags('locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all locations',
    description: 'Retrieve a flat list of all locations',
  })
  @ApiResponse({
    status: 200,
    description: 'List of locations retrieved successfully',
    type: [Location],
  })
  findAll(): Promise<Location[]> {
    return this.locationsService.findAll();
  }

  @Get('hierarchy')
  @ApiOperation({
    summary: 'Get locations hierarchy',
    description: 'Retrieve locations organized in hierarchy: archipel -> commune -> îles',
  })
  @ApiResponse({
    status: 200,
    description: 'Hierarchical structure of locations retrieved successfully',
  })
  getHierarchy() {
    return this.locationsService.getHierarchy();
  }

  @Get('archipel/:archipel')
  @ApiOperation({
    summary: 'Get locations by archipel',
    description: 'Retrieve all locations for a specific archipel',
  })
  @ApiParam({ name: 'archipel', description: 'Archipel name' })
  @ApiResponse({
    status: 200,
    description: 'Locations for archipel retrieved successfully',
    type: [Location],
  })
  findByArchipel(@Param('archipel') archipel: string): Promise<Location[]> {
    return this.locationsService.findByArchipel(archipel);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get location by ID',
    description: 'Retrieve a specific location by its ID',
  })
  @ApiParam({ name: 'id', description: 'Location ID', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Location retrieved successfully',
    type: Location,
  })
  @ApiResponse({ status: 404, description: 'Location not found' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Location> {
    return this.locationsService.findOne(id);
  }
}
