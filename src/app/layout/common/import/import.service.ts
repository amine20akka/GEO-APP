import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ImportDialogComponent } from './import-dialog/import-dialog.component';
import Feature from 'ol/Feature';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { MapService } from 'app/modules/admin/services/map.service';

@Injectable({
  providedIn: 'root'
})
export class ImportService {
  constructor(private dialog: MatDialog, private mapService: MapService) {}
  
  openFileInput(): void {
    const dialogRef = this.dialog.open(ImportDialogComponent, {
      width: 'auto'
    });
  
    dialogRef.afterClosed().subscribe((features: Feature[] | undefined) => {
      if (features && features.length > 0) {
        this.addFeaturesToMap(features);
      }
    });
  }
  
  addFeaturesToMap(features: Feature[]): void {
    const vectorSource = new VectorSource({
      features: features
    });
    const vectorLayer = new VectorLayer({
      source: vectorSource
    });
    this.mapService.getMap().addLayer(vectorLayer);
    this.mapService.getMap().getView().fit(vectorSource.getExtent());
  }
}
