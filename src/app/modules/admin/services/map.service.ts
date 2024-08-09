import { Injectable } from '@angular/core';
import Map from 'ol/Map';
import { Feature, Geolocation } from 'ol';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { Control, defaults as defaultControls, FullScreen, Rotate, ScaleLine } from 'ol/control';
import { defaults as defaultInteractions, DblClickDragZoom, DragRotateAndZoom } from 'ol/interaction';
import { XYZ } from 'ol/source';
import { BehaviorSubject, Observable } from 'rxjs';
import { CustomLayer } from 'app/layout/common/quick-chat/quick-chat.types';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Point } from 'ol/geom';
import { Fill, Stroke, Style } from 'ol/style';
import CircleStyle from 'ol/style/Circle';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private mapSubject: BehaviorSubject<Map | null> = new BehaviorSubject<Map | null>(null);
  public map$: Observable<Map | null> = this.mapSubject.asObservable();
  private geolocationLayer: VectorLayer<VectorSource>;

  constructor() { }

  initializeMap(target: string): Map {
    const initialCenter = [1138871.0121687565, 4415980.133146803];
    const initialZoom = 14;

    const rotateButton = new Control({
      element: this.createRotateButton(),
    });

    const map = new Map({
      target: target,
      interactions: defaultInteractions().extend([
        new DblClickDragZoom(),
        new DragRotateAndZoom(),
      ]),
      layers: [
        new TileLayer({
          source: new OSM({
            attributions: []
          }),
          properties: { background: true }
        })
      ],
      view: new View({
        center: initialCenter,
        zoom: initialZoom,
        rotation: 0,
      }),
      controls: defaultControls({
        zoom: true,
        attribution: false,
        rotate: false,
      }).extend([
        new FullScreen({
          className: 'ol-full-screen',
          tipLabel: 'Plein écran',
        }),
        new ScaleLine({
          className: 'ol-scale-line',
          units: 'metric',
          bar: true,
          steps: 4,
          text: true,
          minWidth: 140,
        }),
        rotateButton,
        new Rotate({
          tipLabel: 'Réinitialiser rotation',
        }),
      ])
    });

    this.mapSubject.next(map);

    return map;
  }

  private createRotateButton(): HTMLElement {
    const button = document.createElement('button');
    button.innerHTML = '⟳';
    button.className = 'ol-rotate-custom';

    const element = document.createElement('div');
    element.className = 'ol-control ol-rotate-control';
    element.appendChild(button);

    button.addEventListener('click', () => {
      const map = this.getMap();
      if (map) {
        const view = map.getView();
        const rotation = view.getRotation();
        view.animate({
          rotation: rotation + Math.PI / 4,
          duration: 250
        });
      }
    });

    return element;
  }

  addLayersToMap(customLayers: CustomLayer[]): void {
    const map = this.getMap();
    if (map && customLayers.length > 0) {
      customLayers.forEach(customLayer => {
        if (customLayer.layer && !map.getLayers().getArray().some(layer => layer === customLayer.layer)) {
          map.addLayer(customLayer.layer);
          customLayer.layer.setVisible(false);
        }
      });
    }
  }

  getMap(): Map | null {
    return this.mapSubject.getValue();
  }

  updateMap(map: Map): void {
    this.mapSubject.next(map);
  }

  onBackgroundChange(selectedValue: string): void {
    const map = this.getMap();
    if (!map) {
      console.warn('Map is not initialized');
      return;
    }

    // Remove all current TileLayers (background layers)
    map.getLayers().getArray().forEach(layer => {
      if (layer instanceof TileLayer && layer.get('background')) {
        map.removeLayer(layer);
      }
    });

    // Create and add new background layer
    let backgroundLayer: TileLayer<OSM | XYZ>;
    switch (selectedValue) {
      case 'OSM':
        backgroundLayer = new TileLayer({
          source: new OSM(),
          properties: { background: true }
        });
        break;
      case 'Satellite':
        backgroundLayer = new TileLayer({
          source: new XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          }),
          properties: { background: true }
        });
        break;
      case 'Topographic':
        backgroundLayer = new TileLayer({
          source: new XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
          }),
          properties: { background: true }
        });
        break;
      default:
        console.warn('No matching background layer found');
        return;
    }

    backgroundLayer.setZIndex(-1);
    map.addLayer(backgroundLayer);
  }

  geolocate(): void {
    const map = this.getMap();
    if (!map) {
      console.error('Map is not initialized');
      return;
    }

    // Supprimer l'ancien calque de géolocalisation, le cas échéant
    if (this.geolocationLayer) {
      map.removeLayer(this.geolocationLayer);
    }

    this.geolocationLayer = new VectorLayer({
      source: new VectorSource(),
    });

    const geolocation = new Geolocation({
      trackingOptions: {
        enableHighAccuracy: true,
      },
      projection: map.getView().getProjection(),
    });

    geolocation.setTracking(true);

    geolocation.on('change:position', () => {
      const coordinates = geolocation.getPosition();
      if (coordinates) {
        // Animation vers la position
        map.getView().animate({
          center: coordinates,
          duration: 3000, // Durée de l'animation en millisecondes
          zoom: 15, // Niveau de zoom
        });
        geolocation.setTracking(false); // Stop tracking after getting the position
        // this.addGeolocationMarker(coordinates as [number, number]);
        // map.addLayer(this.geolocationLayer);
      }
    });

    geolocation.on('error', (error) => {
      console.error('Geolocation error:', error);
    });
  }

  private addGeolocationMarker(coordinates: [number, number]): void {
    const marker = new Feature({
      geometry: new Point(coordinates),
    });

    marker.setStyle(new Style({
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({
          color: '#3399CC',
        }),
        stroke: new Stroke({
          color: '#fff',
          width: 2,
        }),
      }),
    }));

    this.geolocationLayer.getSource().clear(); // Clear previous markers if needed
    this.geolocationLayer.getSource().addFeature(marker);
  }

  removeGeolocationLayer(): void {
    const map = this.getMap();
    if (this.geolocationLayer) {
      map.removeLayer(this.geolocationLayer);
      this.geolocationLayer = null;
    }
  }


}