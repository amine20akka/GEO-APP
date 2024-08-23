import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AttributeTableService } from '../attribute-table.service';
import { FilterService } from '../filter/filter.service';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-attribute-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatIconModule,
    MatSortModule,
    MatMenuModule,
    MatTooltipModule,
    MatButtonModule
  ],
  templateUrl: './attribute-table.component.html',
  styleUrls: ['./attribute-table.component.scss']
})
export class AttributeTableComponent implements OnInit {

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _dialogRef: MatDialogRef<AttributeTableComponent>,
    public _attributeTableService: AttributeTableService,
    private _liveAnnouncer: LiveAnnouncer,
    private filterService: FilterService,
  ) {
    this._attributeTableService.features = data.features;
    this._attributeTableService.length = this._attributeTableService.features.length;
    this._attributeTableService.layerName = data.layerName;
  }

  @ViewChild(MatSort) sort: MatSort;

  ngOnInit(): void {
    this._attributeTableService.loadTableData();
  }

  ngAfterViewInit() {
    this._attributeTableService.setSort(this.sort);  
  }

  announceSortChange(sortState: Sort) {
    if (sortState.direction) {
      this._liveAnnouncer.announce(`Sorted ${sortState.direction}ending`);
    } else {
      this._liveAnnouncer.announce('Sorting cleared');
    }
  }

  openFilter(): void {
    this.filterService.openFilter();
  }

  resetFilter(): void {
    this._attributeTableService.resetFilter();
  }

  closeDialog(): void {
    this._dialogRef.close();
  }

  trackByFn(index: number, item: any): any {
    return item.id || index;
  }
}
