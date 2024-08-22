import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ImportDialogComponent } from '../local-import/import-dialog/import-dialog.component';
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
  ) { }

  openFileInput(): void {
    this.dialog.open(ImportDialogComponent, {
      width: 'auto'
    });
  }

  addFeaturesToMap(importedData: { name: string, features: Feature[] }): boolean {
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

    if (!this.layersService.exists(customLayer.features) && !this.layersService.nameExists(customLayer.name)) {
      this.layersService.addLayer(customLayer);
      this.layersService.addFeatures(customLayer);
      customLayer.layer.setVisible(true);
      this.mapService.getMap().getView().fit(vectorSource.getExtent());
      this.snackBar.open(`La couche "${importedData.name}" a été ajouté avec succès`, 'Fermer', {
        duration: 4000,
      });
      return true;
    } else if (this.layersService.nameExists(customLayer.name)) {
      this.snackBar.open(`La couche "${importedData.name}" porte le même nom d'une autre couche. Veuillez choisir un autre nom !`, 'Fermer', {
        duration: 4000,
      });
      return false;
    } else {
      this.snackBar.open(`La couche "${importedData.name}" existe déjà.`, 'Fermer', {
        duration: 3000,
      });
      return false;
    }
  }
}
