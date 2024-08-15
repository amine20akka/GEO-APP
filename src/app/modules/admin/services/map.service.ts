import { Injectable } from '@angular/core';
import Map from 'ol/Map';
import { Geolocation, Feature, Overlay } from 'ol';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { Control, defaults as defaultControls, FullScreen, Rotate, ScaleLine } from 'ol/control';
import { defaults as defaultInteractions, DblClickDragZoom, DragRotateAndZoom, Select } from 'ol/interaction';
import { pointerMove } from 'ol/events/condition';
import { XYZ } from 'ol/source';
import { BehaviorSubject, Observable } from 'rxjs';
import { CustomLayer } from 'app/layout/common/quick-chat/quick-chat.types';
import { ProjectionLike } from 'ol/proj';
import { Circle, Point } from 'ol/geom';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private mapSubject: BehaviorSubject<Map | null> = new BehaviorSubject<Map | null>(null);
  public map$: Observable<Map | null> = this.mapSubject.asObservable();
  isGeolocationActive = false;
  private geolocationLayer: VectorLayer<VectorSource>;
  private geolocation: Geolocation;
  selectInteraction: Select;
  overlay: Overlay;

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
      case 'Light Gray Canvas':
        backgroundLayer = new TileLayer({
          source: new XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
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

    // If geolocation layer exists, remove it and return
    if (this.geolocationLayer) {
      map.removeLayer(this.geolocationLayer);
      this.geolocationLayer = null;
      this.geolocation.setTracking(false);
      this.geolocation = null;
      return;
    }

    this.geolocation = new Geolocation({
      trackingOptions: {
        enableHighAccuracy: true,
      },
      projection: map.getView().getProjection() as ProjectionLike,
    });

    this.geolocation.setTracking(true);

    // Create source and layer for displaying position
    const positionSource = new VectorSource();
    this.geolocationLayer = new VectorLayer({
      source: positionSource,
    });
    map.addLayer(this.geolocationLayer);

    this.geolocation.on('change:position', () => {
      const coordinates = this.geolocation.getPosition();
      if (coordinates) {
        positionSource.clear();
        const positionFeature = new Feature({
          geometry: new Point(coordinates),
          type: 'geolocation',
        });
        positionSource.addFeature(positionFeature);

        // Accuracy circle
        const accuracy = this.geolocation.getAccuracy();
        let accuracyFeature: Feature | null = null;
        if (accuracy) {
          accuracyFeature = new Feature({
            geometry: new Circle(coordinates, accuracy),
            type: 'geolocation',
          });
          positionSource.addFeature(accuracyFeature);
        }

        // Styling
        const styles = [
          // Accuracy circle style
          new Style({
            stroke: new Stroke({
              color: 'rgba(0, 0, 255, 0.2)',
              width: 1,
            }),
            fill: new Fill({
              color: 'rgba(0, 0, 255, 0.1)',
            }),
          }),
          // Position point style
          new Style({
            image: new CircleStyle({
              radius: 6,
              fill: new Fill({
                color: '#3399CC',
              }),
              stroke: new Stroke({
                color: '#fff',
                width: 2,
              }),
            }),
          }),
        ];

        positionFeature.setStyle(styles);
        accuracyFeature?.setStyle(styles[0]);

        const view = map.getView();
        const currentZoom = view.getZoom();

        // Zoom out
        view.animate({
          zoom: currentZoom - 4, // Adjust this value to control how far it zooms out
          duration: 2000
        }, () => {
          // Callback after zoom out is complete
          // Move to new center
          view.animate({
            center: coordinates,
            duration: 2000
          }, () => {
            // Callback after centering is complete
            // Zoom in
            view.animate({
              zoom: 15,
              duration: 2000
            });
          });
        });
      }
      this.geolocation.setTracking(false);
    });

    this.geolocation.on('error', (error) => {
      console.error('Geolocation error:', error);
    });
  }

  addHoverInteraction(): void {
    this.selectInteraction = new Select({
      condition: pointerMove
    });

    // Create the card element dynamically
    const cardElement = document.createElement('mat-card');
    cardElement.className = 'feature-properties-card';

    const cardContent = `
      <mat-card-content>
        <table class="feature-properties-table" id="feature-properties-table">
        </table>
      </mat-card-content>
    `;
    cardElement.innerHTML = cardContent;
    document.body.appendChild(cardElement); // Add the card to the body

    // Function to update card content
    const updateCardContent = (properties: { [key: string]: any }) => {
      const tableElement = document.getElementById('feature-properties-table');
      let contentHtml = '';
      for (const [key, value] of Object.entries(properties)) {
        if (key !== 'geometry') {
          contentHtml += `<tr><td class="property-key"><strong>${key}:</strong></td><td class="property-value">${value}</td></tr>`;
        }
      }
      tableElement.innerHTML = contentHtml;
    };

    let isHovering = false; // Flag to track hovering state

    this.selectInteraction.on('select', (e) => {
      const feature = e.selected[0];
      if (feature && feature.get('type') === 'Feature') {
        const properties = feature.getProperties();
        updateCardContent(properties);
        isHovering = true;
      } else {
        isHovering = false;
        cardElement.style.display = 'none';
      }
    });

    this.getMap().addInteraction(this.selectInteraction);

    // Update card position based on mouse pointer
    this.getMap().on('pointermove', (event) => {
      const feature = this.getMap().forEachFeatureAtPixel(event.pixel, (feature) => feature);
      if (feature && feature.get('type') === 'Feature') {
        // Position the card 2px away from the pointer
        cardElement.style.transform = `translate(${event.pixel[0] + 20}px, ${event.pixel[1] + 20}px)`;
        cardElement.style.display = 'block';
        isHovering = true;
      } else if (!isHovering) {
        cardElement.style.display = 'none';
      }
    });
  }


}