import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ImportDialogComponent } from './import-dialog/import-dialog.component';
import Feature from 'ol/Feature';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { MapService } from 'app/modules/admin/services/map.service';
import { CustomLayer } from '../quick-chat/quick-chat.types';
import { LayersService } from 'app/modules/admin/services/layers.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root'
})
export class ImportService {
  constructor(
    private dialog: MatDialog, 
    private mapService: MapService, 
    private layersService: LayersService,
    private snackBar: MatSnackBar
  ) {}
  
  openFileInput(): void {
    const dialogRef = this.dialog.open(ImportDialogComponent, {
      width: 'auto'
    });
  
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result && result.features.length > 0) {
        this.addFeaturesToMap(result);
      }
    });
  }
  
  addFeaturesToMap(importedData: { name: string, features: Feature[] }): void {
    const vectorSource = new VectorSource({
      features: importedData.features
    });
  
    const vectorLayer = new VectorLayer({
      source: vectorSource
    });
  
    const customLayer: CustomLayer = {
      id: uuidv4(),
      name: importedData.name,
      type: 'VECTOR',
      layer: vectorLayer,
      source: 'IMPORT',
      features: importedData.features,
    };

    if (!this.layersService.exists(customLayer)) {
      this.layersService.addLayer(customLayer);
      customLayer.layer.setVisible(true);
      this.mapService.getMap().getView().fit(vectorSource.getExtent());
    } else {
      this.snackBar.open(`La couche "${importedData.name}" existe déjà.`, 'Fermer', {
        duration: 3000,
      });
    }
  }
}
