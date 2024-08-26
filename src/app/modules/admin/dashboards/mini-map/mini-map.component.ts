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
import { defaults as defaultControls, FullScreen } from 'ol/control';


@Component({
  selector: 'app-mini-map',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, CommonModule, MatTooltip],
  templateUrl: './mini-map.component.html',
  styleUrls: ['./mini-map.component.scss']
})
export class MiniMapComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() selectedLayer: CustomLayer | null = null;
  @ViewChild('mapElement', { static: false }) mapElement: ElementRef;
   clicked : boolean = false;
  private map: Map | null = null;
  isExpanded: boolean = false;

  constructor(private mapService: MapService, private _router: Router) {
  }

  ngOnInit() { }

  ngAfterViewInit() {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges) {
    if ( changes.selectedLayer.firstChange) {
      this.updateLayerStyle();
    };
    if(changes.selectedLayer ){
      this.updateMap();

    }
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.setTarget(undefined);
      this.map = null;
    }
  }

  private initMap() {
    if (this.mapElement && this.mapElement.nativeElement) {
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
        }),
        controls: defaultControls({
          zoom: false,
          attribution: false,
          rotate: false
        }).extend([
          new FullScreen({
            className: 'ol-full-screen'
          })
        ])
      });
      if (this.selectedLayer) {
        this.updateMap();
      }
    } else {
      console.error('Map element not found');
    }
  }
  private updateLayerStyle() {
    if (this.map && this.selectedLayer && this.selectedLayer.layer) {
      const layers = this.map.getLayers().getArray();
      const miniMapLayer = layers.find(layer => layer !== this.map.getLayers().item(0)); // Assuming the first layer is the base layer
      
      if (miniMapLayer && miniMapLayer instanceof VectorLayer && this.selectedLayer.layer instanceof VectorLayer) {
        // Update the style of the existing layer
        miniMapLayer.setStyle(this.selectedLayer.layer.getStyle());
        this.map.render();
      }
    }
  }
  private updateMap() {
    if (this.map && this.selectedLayer && this.selectedLayer.layer) {
      // Clear existing layers except the base layer
      const layersToRemove = this.map.getLayers().getArray().slice(1);
      layersToRemove.forEach(layer => this.map.removeLayer(layer));

      // Clone the selected layer or create a new layer with the same source
      let miniMapLayer;
      if (this.selectedLayer.layer instanceof VectorLayer) {
        miniMapLayer = new VectorLayer({
          source: this.selectedLayer.layer.getSource(),
          style: this.selectedLayer.layer.getStyle()
        });
      } else if (this.selectedLayer.layer instanceof TileLayer) {
        miniMapLayer = new TileLayer({
          source: this.selectedLayer.layer.getSource()
        });
      } else {
        console.error('Unsupported layer type');
        return;
      }

      // Add the cloned layer to the mini-map
      this.map.addLayer(miniMapLayer);

      // Determine the extent based on the layer type and available data
      let extent: Extent | undefined;

      if (this.selectedLayer.type === 'VECTOR' && this.selectedLayer.features.length > 0) {
        extent = this.getExtentFromFeatures(this.selectedLayer.features);
      } else if (this.selectedLayer.type === 'RASTER') {
        extent = this.getExtentFromRasterLayer(miniMapLayer);
      }

      if (extent && !extent.every(v => v === Infinity || v === -Infinity)) {
        this.map.getView().fit(extent, {
          padding: [50, 50, 50, 50],
          maxZoom: 19,
          duration: 1000  // Add smooth animation
        });
      } else {
        this.map.getView().setCenter([0, 0]);
        this.map.getView().setZoom(2);
      }

      this.map.updateSize();

      // Force a redraw after a short delay
      setTimeout(() => {
        this.map.renderSync();
      }, 500);
    }
  }



  private updateMapSize() {
    if (this.map) {
      // Force the map to update its size
      setTimeout(() => {
        this.map.updateSize();
        this.map.renderSync();
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
    this._router.navigate(['/dashboards/pmap']);
  }

  toggleMapSize(): void {
    this.isExpanded = !this.isExpanded;
    setTimeout(() => {
      this.updateMapSize();
      if (this.selectedLayer) {
        this.updateMap();
      }
    }, 100);
  }
  
}