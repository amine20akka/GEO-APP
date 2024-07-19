import { Injectable } from '@angular/core';
import axios from 'axios';
 
@Injectable({
  providedIn: 'root'
})
export class LayersService {
  private geoServerUrl = 'http://localhost:8080/geoserver/rest';
 
  constructor() {}
 
  // Step 1: Output layers [name: layer-name, href: layer-name.json]
  fetchLayersFromWorkspace(workspace: string) {
    const url = `${this.geoServerUrl}/workspaces/${workspace}/layers`;
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
 
  // Step 2: interface Layer = map(layer-name.json) (
                              // "name": "route",
                              // "type": "VECTOR",
                              // "defaultStyle": {
                                //   "name": "line",
                                //   "href": "http://localhost:8080/geoserver/rest/styles/line.json"
                              // },
                              // "resource": {
                              //   "@class": "featureType",
                              //   "name": "test_data:route",
                              //   "href": "http://localhost:8080/geoserver/rest/workspaces/test_data/datastores/test_data/featuretypes/route.json"
                              // },
                              // "attribution",
                              // "dateCreated",
                              // )
 
  // Step 3: WMS => addWMSLayer(layerName: string): void {
                      //   const wmsLayer = new TileLayer({
                      //     source: new TileWMS({
                      //       url: 'http://localhost:8080/geoserver/test_data/wms',
                      //       params: {
                      //         'SERVICE': 'WMS',
                      //         'VERSION': '1.1.0',
                      //         'REQUEST': 'GetMap',
                      //         'LAYERS': layerName,
                      //         'STYLES': '',
                      //         'SRS': 'EPSG:4326',
                      //         'FORMAT': 'image/png'
                      //       },
                      //       serverType: 'geoserver'
                      //     })
                      //   });
 
                      //   this.addLayer(wmsLayer);
                      //   this.layersAffichés[layerName] = wmsLayer; // Store the layer dans les layers affichés
                      // }
     
  // Step 4: WFS  => Table attributaire (url: http://localhost:8080/geoserver/test_data/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=${LAYER-NAME}&outputFormat=application/json)                              
 
  // Step 5:
            // Style Récupérer le style SLD depuis GeoServer.
            // Analyser le fichier SLD pour extraire les propriétés et les sauvgarder dans localStorage (avec vérification si le style est déjà sauvgardé)
            // Afficher ces propriétés dans l'interface utilisateur Angular.
            // Modifier les propriétés et envoyer les modifications à localStorage.
 
  // Import feature : Create a style for the layer (random or manual)
 
  processWorkspaceLayersData(data: any, addLayerCallback: (layerName: string) => void): void {
    const layers = data.layers.layer;
    const layerNames = layers.map((layer: any) => layer.name);
 
    layerNames.forEach((layerName: string) => {
      addLayerCallback(layerName);
    });
  }
 
 
 
}