import { AfterViewInit, Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CustomLayer } from 'app/layout/common/quick-chat/quick-chat.types';
import { MapService } from '../../services/map.service';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { Extent, createEmpty as createEmptyExtent, extend as extendExtent } from 'ol/extent';
import { Feature } from 'ol';
import { Layer } from 'ol/layer';
import { Source } from 'ol/source';
import VectorLayer from 'ol/layer/Vector';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
  selector: 'app-mini-map',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, CommonModule , MatTooltip],
  templateUrl: './mini-map.component.html',
  styleUrls: ['./mini-map.component.scss']
})
export class MiniMapComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() selectedLayer: CustomLayer | null = null;
  @ViewChild('mapElement', { static: false }) mapElement: ElementRef;

  private map: Map | null = null;
  isExpanded: boolean = false;

  constructor(private mapService: MapService, private _router: Router) {
    console.log('MiniMapComponent: constructor');
  }

  ngOnInit() {
    console.log('MiniMapComponent: ngOnInit', this.selectedLayer);
  }

  ngAfterViewInit() {
    console.log('MiniMapComponent: ngAfterViewInit');
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('MiniMapComponent: ngOnChanges', changes);
    if (changes.selectedLayer) {
      console.log('Selected layer changed:', this.selectedLayer);
      this.updateMap();
    }
  }

  ngOnDestroy() {
    console.log('MiniMapComponent: ngOnDestroy');
    if (this.map) {
      this.map.setTarget(undefined);
      this.map = null;
    }
  }

  private initMap() {
    console.log('MiniMapComponent: initMap start');
    if (this.mapElement && this.mapElement.nativeElement) {
      console.log('Map element found:', this.mapElement.nativeElement);
      this.map = new Map({
        target: this.mapElement.nativeElement,
        layers: [
          new TileLayer({
            source: new OSM()
          })
        ],
        view: new View({
          center: [0, 0],
          zoom: 2
        })
      });
      console.log('Map initialized:', this.map);
      if (this.selectedLayer) {
        this.updateMap();
      }
    } else {
      console.error('Map element not found');
    }
  }

   private updateMap() {
    console.log('MiniMapComponent: updateMap', this.selectedLayer);
    if (this.map && this.selectedLayer && this.selectedLayer.layer) {
      // Clear existing layers except the base layer
      const layersToRemove = this.map.getLayers().getArray().slice(1);
      layersToRemove.forEach(layer => this.map.removeLayer(layer));

      // Add the new selected layer
      this.map.addLayer(this.selectedLayer.layer);
      console.log('Layer added to map:', this.selectedLayer.layer);

      // Determine the extent based on the layer type and available data
      let extent: Extent | undefined;

      if (this.selectedLayer.type === 'VECTOR' && this.selectedLayer.features.length > 0) {
        extent = this.getExtentFromFeatures(this.selectedLayer.features);
      } else if (this.selectedLayer.type === 'RASTER') {
        extent = this.getExtentFromRasterLayer(this.selectedLayer.layer);
      }

      console.log('Calculated extent:', extent);

      if (extent && !extent.every(v => v === Infinity || v === -Infinity)) {
        this.map.getView().fit(extent, { 
          padding: [50, 50, 50, 50], 
          maxZoom: 19,
          duration: 1000  // Add smooth animation
        });
        console.log('View fit to extent');
      } else {
        console.log('No valid extent found, using default view');
        this.map.getView().setCenter([0, 0]);
        this.map.getView().setZoom(2);
      }

      this.map.updateSize();
      console.log('Map size updated');

      // Force a redraw after a short delay
      setTimeout(() => {
        this.map.renderSync();
        console.log('Forced map redraw');
      }, 500);
    } else {
      console.log('Map or selected layer is null, cannot update');
    }
  }

  private resetMapView() {
    if (this.map) {
      this.map.getView().setCenter([0, 0]);
      this.map.getView().setZoom(2);
      this.updateMapSize();
      console.log('Map view reset to default');
    }
  }

  private updateMapSize() {
    if (this.map) {
      // Force the map to update its size
      setTimeout(() => {
        this.map.updateSize();
        console.log('Map size updated');
        this.map.renderSync();
        console.log('Forced map redraw');
      }, 100);
    }
  }

  private getExtentFromFeatures(features: Feature[]): Extent {
    const extent = createEmptyExtent();
    features.forEach(feature => {
      const geometry = feature.getGeometry();
      if (geometry) {
        extendExtent(extent, geometry.getExtent());
      }
    });
    return extent;
  }

  private getExtentFromRasterLayer(layer: Layer<Source>): Extent | undefined {
    const source = layer.getSource();
    if ('getExtent' in source && typeof source.getExtent === 'function') {
      return source.getExtent();
    }
    return undefined;
  }

  navigateToPMap(): void {
    console.log('Navigating to PMap');
    this._router.navigate(['/dashboards/pmap']);
  }

  toggleMapSize(): void {
    this.isExpanded = !this.isExpanded;
    console.log('Map size toggled, isExpanded:', this.isExpanded);
    setTimeout(() => {
      this.updateMapSize();
      if (this.selectedLayer) {
        this.updateMap();
      }
    }, 100);
  }
}