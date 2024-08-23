import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { MapService } from '../../services/map.service';
import { LayersService } from '../../services/layers.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import Map from 'ol/Map';
import { Subscription } from 'rxjs';
import { CustomLayer } from 'app/layout/common/quick-chat/quick-chat.types';

@Component({
  selector: 'app-pmap',
  templateUrl: './p-map.component.html',
  styleUrls: ['./p-map.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
})
export class PMapComponent implements OnInit, OnDestroy {
  
  private subscriptions: Subscription = new Subscription();
  layers: CustomLayer[] = [];
  map: Map | null = null;

  constructor(private mapService: MapService, private layersService: LayersService) { }

  ngOnInit() {
    this.initializeMap();
    this.initializeLayers();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initializeMap() {
    this.mapService.initializeMap('map');
    
    this.subscriptions.add(
      this.mapService.mapState$.subscribe(map => {
        this.map = map;
      })
    );
  }

  private initializeLayers() {
    this.subscriptions.add(
      this.layersService.layers$.subscribe((layers) => {
        this.layers = layers;
        this.addLayersToMap();
      })
    );

    this.layersService.fetchLayersFromWorkspace('test_data').catch(error => {
      console.error('Error fetching layers:', error);
    });
  }

  private addLayersToMap() {
    if (this.map && this.layers.length > 0) {
      this.layers.forEach(customLayer => {
        if (!this.map.getLayers().getArray().includes(customLayer.layer)) {
          this.map.addLayer(customLayer.layer);
          customLayer.layer.setVisible(false);
        }
      });
    }
  }
  
}
