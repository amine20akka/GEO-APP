import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CustomLayer } from '../quick-chat.types';
import { AttributeTableComponent } from './attribute-table-dialog/attribute-table.component';
import { Feature } from 'ol';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';

@Injectable({
  providedIn: 'root'
})
export class AttributeTableService {
  layerName: string = '';
  length = 0;
  dataSource = new MatTableDataSource();
  filteredDataSource = new MatTableDataSource();
  displayedColumns: string[] = [];
  features: Feature[] = [];
  filteredFeatures: Feature[] = [];
  isFilterApplied: boolean = false;
  sort: MatSort;

  constructor(private dialog: MatDialog) { }

  openAttributeTable(layer: CustomLayer): void {
    if (layer.type === 'VECTOR' && layer.features.length > 0) {
      this.dialog.open(AttributeTableComponent, {
        data: { features: layer.features, layerName: layer.name },
        width: 'auto',
        height: 'auto',
      });
    }
  }

  loadTableData(): void {
    if (this.features.length > 0) {
      const properties = this.features[0].getProperties();
      this.displayedColumns = Object.keys(properties).filter(key => key !== 'geometry' && key !== '_layerName_$' && key !== '_type_$');
      const DATA = this.features.map(feature => feature.getProperties());
      this.dataSource = new MatTableDataSource(DATA);
      this.filteredDataSource = new MatTableDataSource(DATA);
    }
  }

  setSort(sort: MatSort): void {
    this.sort = sort;
    this.filteredDataSource.sort = this.sort;
  }

  applyFilter(filter: { column: string, value: any, type: string }): void {
    this.filteredFeatures = this.features.filter(item => {
      const itemValue = item.getProperties()[filter.column];
      if (itemValue) {
        if (filter.type === 'number') {
          const { min, max } = filter.value;
          return itemValue >= min && itemValue <= max;
        } else {
          return itemValue.toString().toLowerCase().includes(filter.value.toString().toLowerCase());
        }
      }
    });
    this.length = this.filteredFeatures.length;
    const filteredData = this.filteredFeatures.map(feature => feature.getProperties());
    this.filteredDataSource = new MatTableDataSource(filteredData);
    this.filteredDataSource.sort = this.sort;
    this.isFilterApplied = true;
  }

  resetFilter(): void {
    this.isFilterApplied = false;
    this.filteredDataSource = this.dataSource;
    this.length = this.features.length;
    this.filteredDataSource.sort = this.sort;
  }
}
