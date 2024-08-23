import { Injectable } from '@angular/core';
import Map from 'ol/Map';
import { Geolocation, Feature } from 'ol';
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
import { MatSnackBar } from '@angular/material/snack-bar';

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

  constructor(private snackBar: MatSnackBar) { }

  /**
   * Initializes the OpenLayers map and sets it to the provided target.
   * @param target - The target element ID where the map will be rendered.
   * @returns The initialized map instance.
   */
  initializeMap(target: string): Map {
    const initialCenter = [0, 0];
    const initialZoom = 0;

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
            attributions: [] // Disabling default attributions
          }),
          properties: { background: true } // Setting the layer as background
        })
      ],
      view: new View({
        center: initialCenter,
        zoom: initialZoom,
        rotation: 0
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

  /**
   * Retrieves the current map instance.
   * @returns The current map instance or null if not initialized.
   */
  getMap(): Map | null {
    return this.mapSubject.getValue();
  }

  /**
   * Updates the current map instance and notifies subscribers.
   * @param map - The new map instance.
   */
  updateMap(map: Map): void {
    this.mapSubject.next(map);
  }

   /**
   * Handles the background layer change by removing existing background layers
   * and adding a new one based on the selected value.
   * @param selectedValue - The value representing the desired background layer.
   */
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


    // Create the new background layer based on the selected value
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
        return; // Exit if no valid selection
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


    this.geolocation.on('change:position', () => {
      const coordinates = this.geolocation.getPosition();
      if (coordinates) {
        const accuracy = this.geolocation.getAccuracy();
        const view = map.getView();

        if (accuracy && accuracy > 100) { // Adjust the threshold as needed
          // Extent of the accuracy circle
          const extent = new Circle(coordinates, accuracy).getExtent();
          if (extent) {
            view.fit(extent, {
              duration: 4000,
              maxZoom: 15 // Adjust this value as needed
            });
          }
          this.isGeolocationActive = false;
          this.geolocation.setTracking(false);
          this.snackBar.open('Votre position exacte n\'a pas pu être déterminée. Veuillez vérifier votre connexion Internet ou d\'autres paramètres réseau.', 'Fermer', {
            duration: 10000,
          });
          return;
        }
        const positionSource = new VectorSource();
        this.geolocationLayer = new VectorLayer({
          source: positionSource,
        });
        map.addLayer(this.geolocationLayer);

        positionSource.clear();
        const positionFeature = new Feature({
          geometry: new Point(coordinates),
          type: 'geolocation',
        });
        positionSource.addFeature(positionFeature);

        // Accuracy circle
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

        const extent = positionFeature.getGeometry()?.getExtent();
        if (extent) {
          // First, zoom out with a larger extent
          const largerExtent = [
            extent[0] - 6000, // Adjust these values to control the larger extent
            extent[1] - 6000,
            extent[2] + 6000,
            extent[3] + 6000
          ];

          // Fit the larger extent with a zoom-out effect
          view.fit(largerExtent, {
            duration: 4000, // Duration for the first zoom out
          });

          // After zooming out, animate to the exact extent and zoom in
          setTimeout(() => {
            view.fit(extent, {
              duration: 4000,
              maxZoom: 15,
            });
          }, 4000); // This timeout should match the duration of the first fit
        }
      }
      this.geolocation.setTracking(false);
    });

    this.geolocation.on('error', (error) => {
      console.error('Geolocation error:', error);
      this.snackBar.open('Erreur de géolocalisation : ' + error.message, 'Fermer', {
        duration: 5000,
      });
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
      <mat-card-header class="feature-properties-header">
        <mat-card-title id="feature-layer-title"></mat-card-title>
      </mat-card-header>
      <mat-divider class="divider"></mat-divider>
      <mat-card-content>
        <table class="feature-properties-table" id="feature-properties-table"></table>
      </mat-card-content>
      <mat-divider class="divider"></mat-divider>
    `;
    cardElement.innerHTML = cardContent;
    document.body.appendChild(cardElement); // Add the card to the body

    // Function to update card content and title
    const updateCardContent = (properties: { [key: string]: any }, layerName: string) => {
      const tableElement = document.getElementById('feature-properties-table');
      const titleElement = document.getElementById('feature-layer-title');

      let contentHtml = '';
      for (const [key, value] of Object.entries(properties)) {
        if (key !== 'geometry' && key !== '_layerName_$' && key !== '_type_$') {
          contentHtml += `<tr><td class="property-key"><strong>${key}:</strong></td><td class="property-value">${value}</td></tr>`;
        }
      }
      tableElement.innerHTML = contentHtml;
      titleElement.textContent = layerName;
    };

    let isHovering = false; // Flag to track hovering state

    this.selectInteraction.on('select', (e) => {
      const feature = e.selected[0];
      if (feature && feature.get('_type_$') === 'Feature') {
        const properties = feature.getProperties();
        const layerName = feature.get('_layerName_$');
        updateCardContent(properties, layerName);
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
      if (feature && feature.get('_type_$') === 'Feature') {
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
