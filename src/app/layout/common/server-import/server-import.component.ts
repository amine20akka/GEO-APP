import { Component } from '@angular/core';
import { AsyncPipe, NgClass } from '@angular/common';
import { LayersService } from 'app/modules/admin/services/layers.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule, MatLabel } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatOptionModule } from '@angular/material/core';
import { MatListOption, MatSelectionList } from '@angular/material/list';
import { CustomLayer } from '../quick-chat/quick-chat.types';
import { MatSnackBar } from '@angular/material/snack-bar';
import { async, finalize, map, Observable } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-server-import',
  standalone: true,
  imports: [
    NgClass,
    AsyncPipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatLabel,
    MatOptionModule,
    MatSelectionList,
    MatListOption,
    MatButtonModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
  ],
  templateUrl: './server-import.component.html',
  styleUrl: './server-import.component.scss'
})
export class ServerImportComponent {
  importForm: FormGroup;
  availableLayers: { layer: CustomLayer; exists: boolean; sameName: boolean }[] = [];
  fetchedLayersExist: boolean = true;
  layersAreSelected: boolean = false;
  isLoading: boolean = false;

  constructor(private fb: FormBuilder, private layersService: LayersService, private snackBar: MatSnackBar) {
    this.importForm = this.fb.group({
      workspaceName: ['', Validators.required],
      selectedLayers: [[]],
    });
  }

  trackByFn(index: number, item: any): any {
    return item.id || index;
  }

  loadLayers(): void {
    this.isLoading = true;
    this.layersAreSelected = false;
    this.importForm.get('selectedLayers').reset();
    this.importForm.get('selectedLayers').setValidators([Validators.required]);
    const workspaceName = this.importForm.get('workspaceName').value;
    if (workspaceName) {
      this.layersService.fetchLayersFromWorkspace(workspaceName).pipe(
        map(layers =>
          layers.map(layer => ({
            layer,
            exists: this.layersService.exists(layer.features),
            sameName: this.layersService.nameExists(layer.name),
          }))
        ),
        finalize(() => {
          this.isLoading = false;
        })
      ).subscribe(result => {
        if (result.length > 0) {
          this.fetchedLayersExist = true;
          this.availableLayers = result;
        } else {
          this.fetchedLayersExist = false;
        }
      });
    }
    this.importForm.get('selectedLayers').valueChanges.subscribe(value => {
      if (value) {
        if (value.length === 0) {
          this.layersAreSelected = false;
        } else {
          this.layersAreSelected = true;
        }
      }
    });
  }

  toggleSelectAll(selectAll: boolean): void {
    const layersControl = this.importForm.get('selectedLayers');
    if (selectAll) {
      layersControl.setValue(this.availableLayers.map(layerObj => layerObj.layer));
    } else {
      layersControl.setValue([]);
    }
  }

  importLayers(): void {
    if (this.importForm.valid) {
      const importedLayers = this.importForm.get('selectedLayers').value;
      importedLayers.forEach(importedLayer => {
        if (!this.layersService.exists(importedLayer.features) && !this.layersService.nameExists(importedLayer.name)) {
          this.layersService.addLayer(importedLayer);
          this.layersService.addFeatures(importedLayer);
        }
      });
    }
    this.loadLayers();
    this.snackBar.open(`Les couches sélectionnées ont été importées avec succès. La liste des couches est mise à jour`, 'Fermer', {
      duration: 5000,
    });
  }
}

