import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { FilterComponent } from './filter-dialog/filter.component';
import { AttributeTableService } from '../attribute-table.service';
import { Feature } from 'ol';

@Injectable({
  providedIn: 'root'
})
export class FilterService {
  filteredFeatures: Feature[] = [];
  columnTypes: { [key: string]: string } = {};

  constructor(
    private dialog: MatDialog, 
    private _attributeTableService: AttributeTableService,
  ) { 
    this.filteredFeatures = _attributeTableService.features;
  }

  openFilter(): void {
    this.dialog.open(FilterComponent, {
      width: '300px',
      data: { columns: this._attributeTableService.displayedColumns,
        columnsTypes: this.columnTypes, 
      }
    });
  }

  detectColumnTypes(): void {
    if (this._attributeTableService.features.length > 0) {
      const sampleFeature = this._attributeTableService.features[0].getProperties();
      for (const key of Object.keys(sampleFeature)) {
        if (typeof sampleFeature[key] === 'number') {
          this.columnTypes[key] = 'number';
        } else {
          this.columnTypes[key] = 'text';
        }
      }
    }
  }

  applyFilter(filter: any): void {
    const { column, value, type } = filter;
    this.filteredFeatures = this._attributeTableService.features.filter(item => {
      const itemValue = item[column];
      if (type === 'number') {
        return itemValue === value;
      } else {
        return itemValue.toString().toLowerCase().includes(value.toString().toLowerCase());
      }
    });
  }
}
