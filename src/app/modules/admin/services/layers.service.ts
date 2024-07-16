import { Injectable } from '@angular/core';
import axios from 'axios';

@Injectable({
  providedIn: 'root'
})
export class LayersService {
  private geoServerUrl = 'http://localhost:8080/geoserver/rest';

  constructor() {}

  fetchLayersFromWorkspace(workspace: string) {
    const url = `${this.geoServerUrl}/workspaces/${workspace}/layers`;
    console.log("url" , url)
    return axios.get(url, {
      auth: {
        username: 'admin',
        password: 'geoserver'
      }
    })
    .then(response => {
      if (response.status !== 200) {
        throw new Error('Failed to fetch layers');
      }
      return response.data;
    })
    .catch(error => {
      console.error('Error fetching layers:', error);
      throw error;
    });
  }

  processWorkspaceLayersData(data: any, addLayerCallback: (layerName: string) => void): void {
    const layers = data.layers.layer;
    const layerNames = layers.map((layer: any) => layer.name);

    layerNames.forEach((layerName: string) => {
      addLayerCallback(layerName);
    });
  }

  
  
}