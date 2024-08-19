import { Component, OnDestroy, AfterViewInit, Input } from '@angular/core';
import { Draw, Modify } from 'ol/interaction';
import { Style, Stroke, Fill, Circle as CircleStyle } from 'ol/style';
import { LineString } from 'ol/geom';
import { MapService } from 'app/modules/admin/services/map.service';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Overlay from 'ol/Overlay';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import Map from 'ol/Map';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'distance-measure',
  standalone: true,
  templateUrl: './distance.component.html',
  styleUrls: ['./distance.component.scss'],
  exportAs: 'distance-measure',
  imports: [MatIconModule, MatButtonModule, MatTooltipModule]
})
export class DistanceComponent implements OnDestroy, AfterViewInit {
  @Input() tooltip: string;

  private map: Map;
  private draw: Draw;
  private modify: Modify;
  private vector: VectorLayer<VectorSource>;
  private source: VectorSource;
  private pointerMoveListener: any;
  private indicatorOverlay: Overlay;
  private distanceOverlay: Overlay;
  isMeasuring: boolean = false; // Flag to track measurement state

  constructor(private mapService: MapService) { }

  ngAfterViewInit(): void {
    this.map = this.mapService.getMap();
    if (!this.map) {
      console.error('Map is not initialized');
      return;
    }

    // Create the distance overlay
    const container = document.createElement('div');
    container.className = 'distance-overlay';
    container.innerHTML = `
      <div class="distance-info">
        <span id="distanceText"></span>
        <div class="separator"></div>
        <button id="closeButton" class="close-button">X</button>
      </div>
    `;

    this.distanceOverlay = new Overlay({
      element: container,
      positioning: 'bottom-center',
      stopEvent: false,
    });

    this.map.addOverlay(this.distanceOverlay);

    // Add event listener to the close button
    container.querySelector('#closeButton').addEventListener('click', () => {
      this.clearMeasurement();
    });

    // Apply inline styles directly
    container.querySelector('.distance-info').setAttribute('style', `
      display: flex;
      align-items: center;
      background-color: rgba(43, 44, 44, 0.7); /* Grey transparent background */
      color: white; /* White font color */
      padding: 10px; /* Padding */
      border-radius: 10px; /* Round border */
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5); /* Shadow */
      font-weight: bold; /* Bold font */
    `);

    const closeButton = container.querySelector('.close-button');
    closeButton.setAttribute('style', `
      background: transparent;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
      padding: 0 5px;
    `);

    const separator = container.querySelector('.separator');
    separator.setAttribute('style', `
      width: 1px;
      height: 20px;
      background-color: white;
      margin: 0 10px;
    `);
  }

  ngOnDestroy(): void {
    const container = this.distanceOverlay.getElement();
    if (container) {
      container.parentNode.removeChild(container);
    }
    this.clearMeasurement();
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

  private formatLength(length: number): string {
    if (length > 1000) {
      return `${(length / 1000).toFixed(2)} km`;
    }
    return `${length.toFixed(2)} m`;
  }

  startMeasure(): void {
    if (this.isMeasuring) {
      console.log('Measurement is already in progress.');
      return;
    }

    if (this.vector) {
      this.map.removeLayer(this.vector);
      this.distanceOverlay.setPosition(undefined);
    }

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

    this.draw = new Draw({
      source: this.source,
      type: 'LineString'
    });

    this.map.addInteraction(this.draw);
    this.isMeasuring = true;

    // Show the indicator
    this.showIndicator();

    // Add pointer move listener
    this.pointerMoveListener = this.map.on('pointermove', (evt) => {
      this.updateIndicatorPosition(evt.coordinate);
    });

    this.draw.on('drawstart', (evt) => {
      this.hideIndicator();
      this.source.clear(); // Clear any existing features
      this.distanceOverlay.setPosition(undefined); // Hide the overlay
      const sketch = evt.feature;

      sketch.getGeometry().on('change', (e) => {
        const geom = e.target as LineString;
        const length = geom.getLength();
        const midCoord = geom.getCoordinateAt(0.5);

        // Update the overlay content and position dynamically
        const element = this.distanceOverlay.getElement();
        if (element) {
          element.querySelector('#distanceText').innerHTML = `Distance: ${this.formatLength(length)}`;
          this.distanceOverlay.setPosition(midCoord);
        }
      });
    });

    this.draw.on('drawend', (evt) => {
      const geom = evt.feature.getGeometry() as LineString;
      const length = geom.getLength();
      const midCoord = geom.getCoordinateAt(0.5);

      // Update the overlay content and position with the final measurement
      const element = this.distanceOverlay.getElement();
      if (element) {
        element.querySelector('#distanceText').innerHTML = `Distance: ${this.formatLength(length)}`;
        this.distanceOverlay.setPosition(midCoord);
      }

      this.map.removeInteraction(this.draw);

      // Create the Modify interaction
      this.modify = new Modify({ source: this.source });
      this.map.addInteraction(this.modify);

      // Update distance on geometry change
      this.modify.on('modifystart', (evt) => {
        const features = evt.features.getArray();
        if (features.length > 0) {
            const feature = features[0]; // Assuming you're only modifying one feature
            const geom = feature.getGeometry() as LineString;
            const length = geom.getLength();
            const midCoord = geom.getCoordinateAt(0.5);
    
            // Update overlay content and position
            const element = this.distanceOverlay.getElement();
            if (element) {
                element.querySelector('#distanceText').innerHTML = `${length.toFixed(2)} m`;
                this.distanceOverlay.setPosition(midCoord);
            }
        }
    });
    

      this.isMeasuring = false;
    });
  }

  clearMeasurement(): void {
    if (this.map) {
      this.map.removeLayer(this.vector);
      this.distanceOverlay.setPosition(undefined);
      this.hideIndicator();
      if (this.pointerMoveListener) {
        this.map.un('pointermove', this.pointerMoveListener);
      }
      this.isMeasuring = false;
    }
    this.map.removeInteraction(this.draw);
    this.map.removeInteraction(this.modify);
  }
}
