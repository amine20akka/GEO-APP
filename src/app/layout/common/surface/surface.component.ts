import { Component, OnDestroy, AfterViewInit, Input } from '@angular/core';
import { Draw, Modify } from 'ol/interaction';
import { Style, Stroke, Fill, Circle as CircleStyle } from 'ol/style';
import { Polygon } from 'ol/geom';
import { MapService } from 'app/modules/admin/services/map.service';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Overlay from 'ol/Overlay';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import Map from 'ol/Map';

@Component({
  selector: 'surface-measure',
  standalone: true,
  templateUrl: './surface.component.html',
  styleUrls: ['./surface.component.scss'],
  exportAs: 'surface-measure',
  imports: [MatIconModule, MatButtonModule, MatTooltipModule]
})
export class SurfaceComponent implements OnDestroy, AfterViewInit {
  @Input() tooltip: string;

  private map: Map;
  private draw: Draw;
  private modify: Modify;
  private vector: VectorLayer<VectorSource>;
  private source: VectorSource;
  private pointerMoveListener: any;
  private indicatorOverlay: Overlay;
  private overlays: Overlay[] = [];
  isMeasuring: boolean = false; // Flag to track measurement state

  constructor(private mapService: MapService) { }

  ngAfterViewInit(): void {
    this.map = this.mapService.getMap();
    if (!this.map) {
      console.error('Map is not initialized');
      return;
    }

    this.source = new VectorSource();
    this.vector = new VectorLayer({
      source: this.source,
      style: new Style({
        fill: new Fill({
          color: 'rgba(255, 255, 255, 0.2)'
        }),
        stroke: new Stroke({
          color: '#ff0000', // Bold red color for the stroke
          width: 5 // Increased width for better visibility
        }),
        image: new CircleStyle({
          radius: 7,
          fill: new Fill({
            color: '#ff0000' // Bold red color for the circle
          })
        })
      })
    });

    this.map.addLayer(this.vector);
  }

  ngOnDestroy(): void {
    this.clearOverlays();

    if (this.map) {
      this.map.removeLayer(this.vector);
    }
    if (this.pointerMoveListener) {
      this.map.un('pointermove', this.pointerMoveListener);
    }
  }

  private showIndicator(): void {
    const indicatorElement = document.createElement('div');
    indicatorElement.className = 'indicator-overlay';
    indicatorElement.innerHTML = '<div class="indicator-message">Cliquer pour commencer à mesurer</div>';
    
    this.indicatorOverlay = new Overlay({
      element: indicatorElement,
      positioning: 'bottom-center',
      offset: [0, -15],
      stopEvent: false,
    });
  
    this.map.addOverlay(this.indicatorOverlay);
  
    // Apply styles to the indicator
    indicatorElement.querySelector('.indicator-message').setAttribute('style', `
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 5px 10px;
      border-radius: 5px;
      font-weight: bold;
      font-size: 12px;
      white-space: nowrap;
    `);
  }
  
  private hideIndicator(): void {
    if (this.indicatorOverlay) {
      this.map.removeOverlay(this.indicatorOverlay);
      this.indicatorOverlay = null;
    }
  }
  
  private updateIndicatorPosition(coordinate: number[]): void {
    if (this.indicatorOverlay) {
      this.indicatorOverlay.setPosition(coordinate);
    }
  }

  private formatArea(area: number): string {
    if (area > 1000000) {
      return `${(area / 1000000).toFixed(2)} km²`;
    }
    return `${area.toFixed(2)} m²`;
  }
  
  startSurfaceMeasure(): void {
    if (this.isMeasuring) {
      console.log('Measurement is already in progress.');
      return;
    }

    if (this.vector) {
      this.vector.getSource().clear(); // Clear the source instead of removing the layer
      this.clearOverlays();
    }

    if (!this.map) {
      console.error('Map is not initialized');
      return;
    }

    this.draw = new Draw({
      source: this.source,
      type: 'Polygon'
    });

    this.map.addInteraction(this.draw);
    this.isMeasuring = true;

    // Show the indicator
    this.showIndicator();

    // Add pointer move listener
    this.pointerMoveListener = this.map.on('pointermove', (evt) => {
      this.updateIndicatorPosition(evt.coordinate);
    });

    this.draw.on('drawstart', () => {
      this.hideIndicator();
      this.source.clear(); // Clear any existing features
      this.clearOverlays(); // Clear existing overlays
    });

    this.draw.on('drawend', (evt) => {
      const geom = evt.feature.getGeometry() as Polygon;
      const area = geom.getArea();
      const coord = geom.getInteriorPoint().getCoordinates();

      // Create and display the overlay with the area measurement
      const element = document.createElement('div');
      element.className = 'area-overlay';
      element.innerHTML = `
        <div class="area-info">
          <span id="areaText">Surface: ${this.formatArea(area)}</span>
          <div class="separator"></div>
          <button id="closeButton" class="close-button">X</button>
        </div>
      `;
      document.body.appendChild(element);

      const overlay = new Overlay({
        element: element,
        positioning: 'bottom-center',
        stopEvent: false,
      });

      this.map.addOverlay(overlay);
      this.overlays.push(overlay);

      element.querySelector('#closeButton').addEventListener('click', () => {
        this.clearMeasurement();
      });

      this.applyOverlayStyles(element);
      overlay.setPosition(coord);

      this.map.removeInteraction(this.draw);
      this.isMeasuring = false;

      // Add Modify interaction
      this.modify = new Modify({ source: this.source });
      this.map.addInteraction(this.modify);

      this.modify.on('modifyend', (evt) => {
        const features = evt.features.getArray();
        if (features.length > 0) {
          const feature = features[0]; // Assuming you're only modifying one feature
          const geom = feature.getGeometry() as Polygon;
          const area = geom.getArea();
          const centroid = geom.getInteriorPoint().getCoordinates();
      
          // Update overlay content and position
          const element = this.overlays[0].getElement(); // Assuming you have only one overlay
          if (element) {
            element.querySelector('#areaText').innerHTML = `Surface: ${this.formatArea(area)}`;
            this.overlays[0].setPosition(centroid);
          }
        }
      });      
    });
  }

  clearMeasurement(): void {
    if (this.map) {
      this.vector.getSource().clear(); // Clear the source instead of removing the layer
      this.clearOverlays();
      this.hideIndicator();
      this.isMeasuring = false; // Reset the measuring flag
      if (this.pointerMoveListener) {
        this.map.un('pointermove', this.pointerMoveListener);
      }
      this.map.removeInteraction(this.draw);
      this.map.removeInteraction(this.modify);
    }
  }

  clearOverlays(): void {
    this.overlays.forEach(overlay => {
      const element = overlay.getElement();
      if (element) {
        element.parentNode.removeChild(element);
      }
      this.map.removeOverlay(overlay);
    });
    this.overlays = [];
  }

  applyOverlayStyles(element: HTMLElement): void {
    const areaInfo = element.querySelector('.area-info');
    if (areaInfo) {
      areaInfo.setAttribute('style', `
        display: flex;
        align-items: center;
        background-color: rgba(43, 44, 44, 0.7); /* Grey transparent background */
        color: white; /* White font color */
        padding: 10px; /* Padding */
        border-radius: 10px; /* Round border */
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5); /* Shadow */
        font-weight: bold; /* Bold font */
      `);
    }

    const closeButton = element.querySelector('.close-button');
    if (closeButton) {
      closeButton.setAttribute('style', `
        background: transparent;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 16px;
        font-weight: bold;
        padding: 0 5px;
      `);
    }

    const separator = element.querySelector('.separator');
    if (separator) {
      separator.setAttribute('style', `
        width: 1px;
        height: 20px;
        background-color: white;
        margin: 0 10px;
      `);
    }
  }
}
