import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { MapService } from '../../services/map.service';
import { LayersService } from '../../services/layers.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-pmap',
  templateUrl: './p-map.component.html',
  styleUrls: ['./p-map.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
})
export class PMapComponent implements OnInit, OnDestroy {
  private layersSubscription: Subscription;

  constructor(private mapService: MapService, private layersService: LayersService) { }

  ngOnInit() {
    this.initializeMap();
    this.initializeLayers();
  }

  ngOnDestroy(): void {
    this.layersSubscription.unsubscribe();
  }

  private initializeMap() {
    this.mapService.initializeMap('map');
  }

  private initializeLayers() {
    this.layersSubscription = this.layersService.layers$.subscribe((layers) => {
        this.mapService.addLayersToMap(layers);
      });

    this.layersService.fetchLayersFromWorkspace('test_data').catch(error => {
      console.error('Error fetching layers:', error);
    });
  }
}
