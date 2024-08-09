import { Component, OnDestroy, AfterViewInit, Input } from '@angular/core';
import { Draw, Modify, Translate } from 'ol/interaction';
import { Style, Stroke, Fill } from 'ol/style';
import { Circle } from 'ol/geom';
import { MapService } from 'app/modules/admin/services/map.service';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Overlay from 'ol/Overlay';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import Map from 'ol/Map';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'circle-measure',
  standalone: true,
  templateUrl: './circle.component.html',
  styleUrls: ['./circle.component.scss'],
  exportAs: 'circle-measure',
  imports: [MatIconModule, MatButtonModule, MatTooltipModule]
})
export class CircleComponent implements OnDestroy, AfterViewInit {
  @Input() tooltip: string = 'Mesurer un cercle';

  private map: Map;
  private draw: Draw;
  private modify: Modify;
  private translate: Translate;
  private vector: VectorLayer<VectorSource>;
  private source: VectorSource;
  private radiusOverlay: Overlay;
  private indicatorOverlay: Overlay;
  isMeasuring: boolean = false;

  constructor(private mapService: MapService) { }

  ngAfterViewInit(): void {
    this.map = this.mapService.getMap();
    if (!this.map) {
      console.error('Map is not initialized');
      return;
    }

    // Create the radius overlay
    const container = document.createElement('div');
    container.className = 'radius-overlay';
    container.innerHTML = `
      <div class="radius-info">
        <span id="radiusText"></span>
        <div class="separator"></div>
        <button id="closeButton" class="close-button">X</button>
      </div>
    `;

    this.radiusOverlay = new Overlay({
      element: container,
      positioning: 'bottom-center',
      stopEvent: false,
    });

    this.map.addOverlay(this.radiusOverlay);

    // Add event listener to the close button
    container.querySelector('#closeButton').addEventListener('click', () => {
      this.clearMeasurement();
    });

    // Apply inline styles
    this.applyOverlayStyles(container);
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

  ngOnDestroy(): void {
    this.hideIndicator();
    this.clearMeasurement();
  }

  private applyOverlayStyles(container: HTMLElement): void {
    container.querySelector('.radius-info').setAttribute('style', `
      display: flex;
      align-items: center;
      background-color: rgba(43, 44, 44, 0.7);
      color: white;
      padding: 10px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
      font-weight: bold;
    `);

    container.querySelector('.close-button').setAttribute('style', `
      background: transparent;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
      padding: 0 5px;
    `);

    container.querySelector('.separator').setAttribute('style', `
      width: 1px;
      height: 20px;
      background-color: white;
      margin: 0 10px;
    `);
  }

  startMeasure(): void {
    if (this.isMeasuring) {
      console.log('Measurement is already in progress.');
      return;
    }

    if (this.vector) {
      this.map.removeLayer(this.vector);
      this.radiusOverlay.setPosition(undefined);
    }

    this.source = new VectorSource();
    this.vector = new VectorLayer({
      source: this.source,
      style: new Style({
        fill: new Fill({
          color: 'rgba(255, 0, 0, 0.2)'
        }),
        stroke: new Stroke({
          color: '#ff0000',
          width: 2
        })
      })
    });

    this.map.addLayer(this.vector);

    this.draw = new Draw({
      source: this.source,
      type: 'Circle'
    });

    this.map.addInteraction(this.draw);
    this.isMeasuring = true;

    // Show the indicator
    this.showIndicator();

    // Add pointer move listener
    this.map.on('pointermove', (evt) => {
      this.updateIndicatorPosition(evt.coordinate);
    });

    this.draw.on('drawstart', (evt) => {
      this.hideIndicator();
      this.source.clear();
      this.radiusOverlay.setPosition(undefined);
      const sketch = evt.feature;

      sketch.getGeometry().on('change', (e) => {
        const geom = e.target as Circle;
        this.updateRadiusOverlay(geom);
      });
    });

    this.draw.on('drawend', (evt) => {
      const geom = evt.feature.getGeometry() as Circle;
      this.updateRadiusOverlay(geom);
    
      this.map.removeInteraction(this.draw);
    
      // Add Modify interaction
      this.modify = new Modify({ source: this.source });
      this.map.addInteraction(this.modify);
    
      // Add Translate interaction
      this.translate = new Translate({
        features: this.source.getFeaturesCollection()
      });
      this.map.addInteraction(this.translate);
    
      // Update overlay on translate
      this.translate.on('translateend', (translateEvt) => {
        const features = translateEvt.features.getArray();
        if (features.length > 0) {
          const feature = features[0];
          const geom = feature.getGeometry() as Circle;
          this.updateRadiusOverlay(geom);
        }
      });
    
      this.modify.on('modifystart', (modifyEvt) => {
        const features = modifyEvt.features.getArray();
        if (features.length > 0) {
          const feature = features[0];
          const geom = feature.getGeometry() as Circle;
          this.updateRadiusOverlay(geom);
        }
      });
    
      this.isMeasuring = false;
    });
  }

  private updateRadiusOverlay(geom: Circle): void {
    const radius = geom.getRadius();
    const center = geom.getCenter();

    const element = this.radiusOverlay.getElement();
    if (element) {
      element.querySelector('#radiusText').innerHTML = `Rayon: ${this.formatLength(radius)}`;
      this.radiusOverlay.setPosition(center);
    }
  }

  private formatLength(length: number): string {
    if (length > 1000) {
      return `${(length / 1000).toFixed(2)} km`;
    }
    return `${length.toFixed(2)} m`;
  }

  clearMeasurement(): void {
    if (this.map) {
      this.map.removeLayer(this.vector);
      this.radiusOverlay.setPosition(undefined);
      this.hideIndicator();
      // Reset cursor style
      this.map.getTargetElement().style.cursor = '';
      // Remove pointermove listener
      // this.map.un("pointermove", this.map.getListeners('pointermove')[0]);
    }
    this.map.removeInteraction(this.draw);
    this.map.removeInteraction(this.modify);
    this.map.removeInteraction(this.translate);
    this.isMeasuring = false;
  }
}