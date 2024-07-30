import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Layer } from 'ol/layer';
import { MapService } from '../../services/map.service';
import { LayersService } from '../../services/layers.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import Map from 'ol/Map';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-pmap',
  templateUrl: './p-map.component.html',
  styleUrls: ['./p-map.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [MatButtonModule, MatIconModule],

})
export class PMapComponent implements OnInit {
  selectedMapSourceId: string = 'osm'; // Default map source
  private layersSubscription: Subscription | null = null;
  private mapStateSubscription: Subscription | null = null;
  layers: Layer[] = [];
  map: Map;

  constructor(private _mapService: MapService, private _layersService: LayersService) { }

  async ngOnInit() {
    this.initializeMap();
    await this.initializeLayers();
  }

  ngOnDestroy(): void {
    this.mapStateSubscription.unsubscribe();
    this.layersSubscription.unsubscribe();
  }

  private initializeMap() {
    this.mapStateSubscription = this._mapService.mapState$.subscribe(map => {
      if (map) {
        this.map = map;
      }
    })

    this._mapService.initializeMap('map');
  }

  private async initializeLayers() {
    this.layersSubscription = this._layersService.layers$.subscribe(layers => {
      this.layers = layers;
    });

    try {
      await this._layersService.fetchLayersFromWorkspace('test_data');
      // Add new layers but visibility = false
      this.layers.forEach(layer => {
        this.map.addLayer(layer);
      });
    } catch (error) {
      console.error('Error fetching and adding layers:', error);
    }
  }
}
