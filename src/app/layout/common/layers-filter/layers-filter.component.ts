import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LayersService } from 'app/modules/admin/services/layers.service';
import { CustomLayer } from '../quick-chat/quick-chat.types';
import { Feature } from 'ol';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule, MatLabel } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import VectorSource from 'ol/source/Vector';
@Component({
  selector: 'app-layers-filter',
  standalone: true,
  imports: [
    MatSelectModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatLabel,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
  ],
  templateUrl: './layers-filter.component.html',
  styleUrls: ['./layers-filter.component.scss']
})
export class LayersFilterComponent {
  filterForm: FormGroup;
  allLayers: CustomLayer[] = [];
  selectedLayer: CustomLayer;
  columns: string[] = [];
  columnType: string = '';
  isFilterPanelVisible = false; // Visibility control for the filter panel
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder, 
    private layersService: LayersService, 
  ) {
    // Initialize the form with validators
    this.filterForm = this.fb.group({
      selectedLayer: ['', Validators.required],
      selectedColumn: ['', Validators.required],
      filterText: [''],
      filterMinNumber: [''],
      filterMaxNumber: ['']
    });

    // Populate the layers list
    this.layersService.layers$.subscribe(layers => {
      this.allLayers = layers;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackByFn(index: number, item: any): any {
    return item.id || index;
  }

  onLayerChange(selectedLayer: CustomLayer): void {
    this.selectedLayer = selectedLayer;
    this.columns = this.getLayerProperties(this.selectedLayer.features);
    this.filterForm.get('selectedColumn').reset();
    this.columnType = '';
  }

  onColumnChange(selectedColumn: string): void {
    this.columnType = this.getColumnType(this.selectedLayer, selectedColumn);
    this.resetFilterControls();
    this.addValidatorsForColumnType();
  }

  resetFilterControls(): void {
    this.filterForm.get('filterText').reset();
    this.filterForm.get('filterMinNumber').reset();
    this.filterForm.get('filterMaxNumber').reset();
  }

  addValidatorsForColumnType(): void {
    if (this.columnType === 'string') {
      this.filterForm.get('filterText').setValidators([Validators.required]);
      this.filterForm.get('filterMinNumber').clearValidators();
      this.filterForm.get('filterMaxNumber').clearValidators();
    } else if (this.columnType === 'number') {
      this.filterForm.get('filterText').clearValidators();
      this.addNumberValidation();
    }
    this.filterForm.get('filterText').updateValueAndValidity();
    this.filterForm.get('filterMinNumber').updateValueAndValidity();
    this.filterForm.get('filterMaxNumber').updateValueAndValidity();
  }

  addNumberValidation(): void {
    this.filterForm.get('filterMinNumber').setValidators(Validators.required);
    this.filterForm.get('filterMaxNumber').setValidators(Validators.required);

    const minControl = this.filterForm.get('filterMinNumber');
    const maxControl = this.filterForm.get('filterMaxNumber');

    minControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((minValue) => {
        if (this.columnType === 'number') {
          if (minValue !== null && maxControl.value !== null && minValue > maxControl.value) {
            maxControl.setValue(minValue);
          }
          maxControl.setValidators([Validators.required, Validators.min(minValue)]);
          maxControl.updateValueAndValidity({ onlySelf: true, emitEvent: false });
        }
      });

    maxControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((maxValue) => {
        if (this.columnType === 'number') {
          if (maxValue !== null && minControl.value !== null && maxValue < minControl.value) {
            minControl.setValue(maxValue);
          }
          minControl.setValidators([Validators.required, Validators.max(maxValue)]);
          minControl.updateValueAndValidity({ onlySelf: true, emitEvent: false });
        }
      });
  }

  onSubmit(): void {
    if (this.filterForm.valid) {
      const selectedColumn = this.filterForm.get('selectedColumn').value;
      const filterText = this.filterForm.get('filterText').value;
      const filterMinNumber = this.filterForm.get('filterMinNumber').value;
      const filterMaxNumber = this.filterForm.get('filterMaxNumber').value;
      
      // Implement the logic to filter the layers based on filter values
      this.selectedLayer.features = this.selectedLayer.features.filter((feature) => {
        const properties = feature.getProperties();
        const selectedColumnValue = properties[selectedColumn];
        if (this.columnType === 'string') {
          return selectedColumnValue.toString().toLowerCase().includes(filterText.toString().toLowerCase());
        } else if (this.columnType === 'number') {
          return selectedColumnValue >= filterMinNumber && selectedColumnValue <= filterMaxNumber;
        }
        return true;
      });

      // Update the source of the selected layer
      const vectorSource = new VectorSource({
        features: this.selectedLayer.features
      });

      this.selectedLayer.layer.setSource(vectorSource);
    }
  }

  resetForm(): void {
    this.filterForm.reset();
    this.columns = [];
    this.columnType = '';
    // Reset to original layers
    
  }

  getLayerProperties(features: Feature[]): string[] {
    return features.length > 0 ? Object.keys(features[0].getProperties()).filter(key => key !== 'geometry' && key !== '_layerName_$' && key !== '_type_$') : [];
  }

  getColumnType(layer: CustomLayer, column: string): string {
    if (layer.features.length > 0) {
      const sampleFeature = layer.features[0].getProperties();
      if (typeof sampleFeature[column] === 'number') {
        return 'number';
      } else {
        return 'string';
      }
    }
  }
}
