import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { MapService } from '../../services/map.service';
import { LayersService } from '../../services/layers.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { ViewHistoryService } from 'app/layout/common/view-history/view-history.service';

@Component({
  selector: 'app-pmap',
  templateUrl: './p-map.component.html',
  styleUrls: ['./p-map.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    MatButtonModule, 
    MatIconModule,
    MatCardModule,
  ],
})
export class PMapComponent implements OnInit, OnDestroy {
  private layersSubscription: Subscription;

  constructor(
    private mapService: MapService, 
    private layersService: LayersService,
    private viewHistoryService: ViewHistoryService,
  ) { }

  ngOnInit() {
    this.initializeMap();
    this.initializeLayers();
  }

  ngAfterViewInit(): void {
    this.mapService.addHoverInteraction();
    this.viewHistoryService.saveCurrentView();
    this.viewHistoryService.trackViewChanges();
  }

  ngOnDestroy(): void {
    if (this.layersSubscription) {
      this.layersSubscription.unsubscribe();
    }
    if (this.mapService.selectInteraction) {
      this.mapService.getMap().removeInteraction(this.mapService.selectInteraction);
    }
  }

  private initializeMap() {
    this.mapService.initializeMap('map');
  }
  filterLayerByName(layers: any[], layerName: string): any | null {
    return layers.find(layer => layer.name === layerName) || null;
  }
  
  
  private initializeLayers() {
    this.layersSubscription = this.layersService.layers$.subscribe((layers) => {
        this.mapService.addLayersToMap(layers);
      });

      this.layersService.fetchLayersFromWorkspace('test_data').subscribe(fetchedLayers => {
        if (fetchedLayers.length > 0) {
          const poiAdminLayer = this.filterLayerByName(fetchedLayers, 'poi_admin');
      
          if (poiAdminLayer) {
            this.layersService.updateLayers([poiAdminLayer]);
            this.layersService.addFeatures(poiAdminLayer);
          }
        }
      });

  }
  
}
