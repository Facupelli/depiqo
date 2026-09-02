import { Injectable } from '@nestjs/common';

import {
  Coordinates,
  RoadRouteDistanceInput,
  RoadRouteDistanceProvider,
  RoadRouteDistanceResult,
} from '../../application/ports/road-route-distance-provider.port';
import { MapboxDirectionsHttpClient } from './mapbox-directions-http.client';

interface MapboxDirectionsRoute {
  distance?: unknown;
}

@Injectable()
export class MapboxRoadRouteDistanceProviderAdapter extends RoadRouteDistanceProvider {
  constructor(private readonly httpClient: MapboxDirectionsHttpClient) {
    super();
  }

  async getDrivingDistance(input: RoadRouteDistanceInput): Promise<RoadRouteDistanceResult> {
    this.assertCoordinates(input.origin);
    this.assertCoordinates(input.destination);

    const coordinates = `${input.origin.longitude},${input.origin.latitude};${input.destination.longitude},${input.destination.latitude}`;
    const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}`);
    url.searchParams.set('alternatives', 'false');
    url.searchParams.set('overview', 'false');
    url.searchParams.set('steps', 'false');

    const body = await this.httpClient.getJson(url);
    if (!this.isRecord(body) || typeof body.code !== 'string') {
      throw this.httpClient.malformedResponse('code must be a string.');
    }

    if (body.code === 'NoRoute' || body.code === 'NoSegment') {
      return { outcome: 'NO_ROUTE' };
    }

    if (body.code !== 'Ok') {
      throw this.httpClient.malformedResponse(`unexpected result code '${body.code}'.`);
    }

    if (!Array.isArray(body.routes)) {
      throw this.httpClient.malformedResponse('routes must be an array.');
    }

    if (body.routes.length === 0) {
      return { outcome: 'NO_ROUTE' };
    }

    const route = body.routes[0] as MapboxDirectionsRoute;
    if (
      !this.isRecord(route) ||
      typeof route.distance !== 'number' ||
      !Number.isFinite(route.distance) ||
      route.distance < 0
    ) {
      throw this.httpClient.malformedResponse('the route distance is invalid.');
    }

    return { outcome: 'ROUTE_FOUND', distanceMeters: Math.round(route.distance) };
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
