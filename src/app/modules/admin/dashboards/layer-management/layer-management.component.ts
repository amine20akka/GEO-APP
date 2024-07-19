import { Component, Input } from '@angular/core';
import { Layer } from 'app/layout/common/quick-chat/quick-chat.types';

interface StyleOptions {
  fill?: { color: string; opacity: number; pattern?: string };
  stroke?: { lineCap: string; width: number };
}
@Component({
  selector: 'app-layer-management',
  standalone: true,
  imports: [],
  templateUrl: './layer-management.component.html',
  styleUrl: './layer-management.component.scss'
})
export class LayerManagementComponent {
  @Input() selectedLayer: Layer; // Input to receive the selected layer
  selectedStyle: StyleOptions = {}; // Stores the user-modified style properties

  constructor() {}

  getDashedLineStyle(): string {
    return `dashed[5 10]`; // Example dashed line style
  }

  getDottedLineStyle(): string {
    return `dotted[1 1]`; // Example dotted line style
  }

  applySymbologyChanges() {
    // Update the selected layer's style based on user selections
    // Implement logic to update GeoServer style (if applicable) using a service
    // (code omitted for brevity)
  }
}

