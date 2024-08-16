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

  constructor(private fb: FormBuilder, private layersService: LayersService) {
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
    console.log(this.columnType);
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
      this.filterForm.get('filterMinNumber').setValidators([Validators.required]);
      this.filterForm.get('filterMaxNumber').setValidators([Validators.required]);
    }
    this.filterForm.get('filterText').updateValueAndValidity();
    this.filterForm.get('filterMinNumber').updateValueAndValidity();
    this.filterForm.get('filterMaxNumber').updateValueAndValidity();
  }

  onSubmit(): void {
    if (this.filterForm.valid) {
      const filterValues = this.filterForm.value;
      // Implement the logic to filter the layers based on filterValues
      const filteredFeatures = this.selectedLayer.features.filter((feature) => {
        const properties = feature.getProperties();
        const selectedColumnValue = properties[filterValues.selectedColumn];
        if (this.columnType === 'string') {
          return selectedColumnValue.includes(filterValues.filterText);
        } else if (this.columnType === 'number') {
          return selectedColumnValue >= filterValues.filterMinNumber && selectedColumnValue <= filterValues.filterMaxNumber;
        }
        return true;
      });
      this.selectedLayer.features = filteredFeatures;
    }
  }

  resetForm(): void {
    this.filterForm.reset();
    this.columns = [];
    this.columnType = '';
  }

  getLayerProperties(features: Feature[]): string[] {
    return features.length > 0 ? Object.keys(features[0].getProperties()) : [];
  }

  getColumnType(layer: CustomLayer, column: string): string {
    if (layer.features.length > 0) {
      const sampleFeature = layer.features[0].getProperties();
      return typeof sampleFeature[column];
    }
    return '';
  }
}
