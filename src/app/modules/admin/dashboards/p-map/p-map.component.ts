import { Component, Input, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ'; // Import XYZ for satellite and topographic layers
import { MapService } from '../../services/map.service';
import { LayersService } from '../../services/layers.service';
import { TileWMS } from 'ol/source';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-pmap',
  templateUrl: './p-map.component.html',
  styleUrls: ['./p-map.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [MatButtonModule, MatIconModule],

})
export class PMapComponent implements OnInit, OnDestroy {
  selectedMapSourceId: string = 'osm'; // Default map source
  map: Map;

  constructor(private mapService: MapService, private layersService: LayersService) { }

  ngOnInit(): void {
    this.mapService.initializeMap('map');

    // Initialize map with default source
    // this.updateMapBackground(this.selectedMapSourceId);

    // Fetch and add WMS layers from GeoServer
    // this.layersService.fetchLayersFromWorkspace('test_data').then(data => {
    //   // this.layersService.processWorkspaceLayersData(data, this.mapService.addWMSLayer.bind(this.mapService));
    // });
  }

  ngOnDestroy(): void {
    // Clean up any subscriptions or resources here
    if (this.map) {
      this.map.setTarget(null);
    }
  }

  ngOnChanges(): void {
    // Respond to changes in selectedMapSourceId
    if (this.selectedMapSourceId && this.map) {
      this.updateMapBackground(this.selectedMapSourceId);
      console.log('on changes Selected value emitted:', this.selectedMapSourceId);

    }
        // Respond to changes in selectedlayer

  }

  private updateMapBackground(selectedValue: string): void {
    // Clear current layers except WMS layers
    // this.map.getLayers().forEach(layer => {
    //   if (!(layer instanceof TileLayer && layer.getSource() instanceof TileWMS)) {
    //     this.map.removeLayer(layer);
    //   }
    // });

    // Add background layer based on selected value
    switch (selectedValue) {
      case 'osm':
        this.map.addLayer(new TileLayer({
          source: new OSM()
        }));
        break;
      case 'satellite':
        this.map.addLayer(new TileLayer({
          source: new XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          })
        }));
        break;
      case 'topographic':
        this.map.addLayer(new TileLayer({
          source: new XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
          })
        }));
        break;
      default:
        break;
    }
  }
}
