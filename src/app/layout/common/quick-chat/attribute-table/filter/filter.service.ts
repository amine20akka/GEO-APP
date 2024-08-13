import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { FilterComponent } from './filter-dialog/filter.component';
import { AttributeTableService } from '../attribute-table.service';

@Injectable({
  providedIn: 'root'
})
export class FilterService {
  columnTypes: { [key: string]: string } = {};

  constructor(
    private dialog: MatDialog, 
    private _attributeTableService: AttributeTableService,
  ) {}

  openFilter(): any {
    this.detectColumnTypes();
    this.dialog.open(FilterComponent, {
      width: 'auto',
      height: 'auto',
      data: { columns: this._attributeTableService.displayedColumns,
        columnTypes: this.columnTypes, 
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

}
