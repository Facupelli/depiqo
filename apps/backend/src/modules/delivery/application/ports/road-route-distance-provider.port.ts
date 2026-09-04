export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface RoadRouteDistanceInput {
  origin: Coordinates;
  destination: Coordinates;
}

export type RoadRouteDistanceResult = { outcome: 'ROUTE_FOUND'; distanceMeters: number } | { outcome: 'NO_ROUTE' };

export abstract class RoadRouteDistanceProvider {
  abstract getDrivingDistance(input: RoadRouteDistanceInput): Promise<RoadRouteDistanceResult>;
}
