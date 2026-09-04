import { Injectable } from '@nestjs/common';

import {
  Coordinates,
  RoadRouteDistanceInput,
  RoadRouteDistanceProvider,
  RoadRouteDistanceResult,
} from '../../application/ports/road-route-distance-provider.port';
import { GeoapifyRoutingHttpClient } from './geoapify-routing-http.client';

interface GeoapifyRoute {
  distance?: unknown;
  distance_units?: unknown;
}

@Injectable()
export class GeoapifyRoadRouteDistanceProviderAdapter extends RoadRouteDistanceProvider {
  constructor(private readonly httpClient: GeoapifyRoutingHttpClient) {
    super();
  }

  async getDrivingDistance(input: RoadRouteDistanceInput): Promise<RoadRouteDistanceResult> {
    this.assertCoordinates(input.origin);
    this.assertCoordinates(input.destination);

    const origin = `lonlat:${input.origin.longitude},${input.origin.latitude}`;
    const destination = `lonlat:${input.destination.longitude},${input.destination.latitude}`;

    const url = new URL('https://api.geoapify.com/v1/routing');

    url.searchParams.set('waypoints', `${origin}|${destination}`);
    url.searchParams.set('mode', 'drive');
    url.searchParams.set('type', 'balanced');
    url.searchParams.set('units', 'metric');
    url.searchParams.set('format', 'json');

    const body = await this.httpClient.getJson(url);

    if (!this.isRecord(body) || !Array.isArray(body.results)) {
      throw this.httpClient.malformedResponse('results must be an array.');
    }

    if (body.results.length === 0) {
      return { outcome: 'NO_ROUTE' };
    }

    const route = body.results[0] as GeoapifyRoute;

    if (
      !this.isRecord(route) ||
      typeof route.distance !== 'number' ||
      !Number.isFinite(route.distance) ||
      route.distance < 0
    ) {
      throw this.httpClient.malformedResponse('the route distance is invalid.');
    }

    return {
      outcome: 'ROUTE_FOUND',
      distanceMeters: Math.round(route.distance),
    };
  }

  private assertCoordinates(coordinates: Coordinates): void {
    if (
      !Number.isFinite(coordinates.latitude) ||
      coordinates.latitude < -90 ||
      coordinates.latitude > 90 ||
      !Number.isFinite(coordinates.longitude) ||
      coordinates.longitude < -180 ||
      coordinates.longitude > 180
    ) {
      throw this.httpClient.malformedResponse('routing coordinates are invalid.');
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
