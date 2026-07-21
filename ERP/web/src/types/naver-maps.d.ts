declare namespace naver.maps {
    type Coord = LatLng;

    class LatLng {
        constructor(lat: number, lng: number);
    }

    class Size {
        constructor(width: number, height: number);
    }

    type MapOptions = {
        readonly center: Coord;
        readonly zoom: number;
        readonly zoomControl?: boolean;
    };

    class Map {
        constructor(element: HTMLElement, options: MapOptions);
        setCenter(center: Coord): void;
        setSize(size: Size): void;
    }

    type MarkerOptions = {
        readonly map: Map;
        readonly position: Coord;
    };

    class Marker {
        constructor(options: MarkerOptions);
        setMap(map: Map | null): void;
    }
}
