import { Pipe, PipeTransform } from '@angular/core';
import { CustomLayer } from 'app/layout/common/quick-chat/quick-chat.types';

@Pipe({
  name: 'filterLayers',
  standalone: true
})
export class FilterLayersPipe implements PipeTransform {
  transform(layers: CustomLayer[], ...sources: string[]): CustomLayer[] {
    return layers.filter(layer => sources.includes(layer.source));
  }
}