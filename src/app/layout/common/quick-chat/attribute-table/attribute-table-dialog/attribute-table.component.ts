import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { CommonModule } from '@angular/common';
import { Feature } from 'ol';
import { MatIconModule } from '@angular/material/icon';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AttributeTableService } from '../attribute-table.service';
import { FilterService } from '../filter/filter.service';

@Component({
  selector: 'app-attribute-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatTabsModule,
    MatIconModule,
    MatSortModule,
    MatMenuModule,
    MatTooltipModule,
  ],
  templateUrl: './attribute-table.component.html',
  styleUrls: ['./attribute-table.component.scss']
})
export class AttributeTableComponent implements OnInit {
  dataSource: any[] = [];
  layerName: string = '';
  length = 0;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _dialogRef: MatDialogRef<AttributeTableComponent>,
    public _attributeTableService: AttributeTableService,
    private _liveAnnouncer: LiveAnnouncer,
    private filterService: FilterService,
  ) {
    this._attributeTableService.features = data.features;
    this.length = this._attributeTableService.features.length;
    this.layerName = data.layerName;
  }

  @ViewChild(MatSort) sort: MatSort;

  ngOnInit(): void {
    this.updateTable(this._attributeTableService.features);
  }

  announceSortChange(sortState: Sort) {
    if (sortState.direction) {
      this._liveAnnouncer.announce(`Sorted ${sortState.direction}ending`);
    } else {
      this._liveAnnouncer.announce('Sorting cleared');
    }
  }

  updateTable(features: Feature[]): void {
    if (features.length > 0) {
      const properties = features[0].getProperties();
      this._attributeTableService.displayedColumns = Object.keys(properties).filter(key => key !== 'geometry');
      this.dataSource = features.map(feature => feature.getProperties()); 
      this._attributeTableService.filteredDataSource = [...this.dataSource];
      this.filterService.detectColumnTypes();
    }
  }

  openFilter(): void {
    this.filterService.openFilter();
  }

  closeDialog(): void {
    this._dialogRef.close();
  }

  trackByFn(index: number, item: any): any {
    return item.id || index;
  }
}
