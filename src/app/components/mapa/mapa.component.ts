import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';


import * as mapboxgl from 'mapbox-gl';
import { Luugar } from 'src/app/interfaces/interfaces';
import { WebsocketService } from 'src/app/services/websocket.service';


interface RespMarcadores {
  [key: string]: Luugar
}

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.component.html',
  styleUrls: ['./mapa.component.css']
})
export class MapaComponent implements OnInit {

  mapa: mapboxgl.Map;
  // lugares: Luugar[] = [];
  lugares: RespMarcadores = {};
  markersMapbox: { [id: string]: mapboxgl.Marker } = {};

  constructor(private http: HttpClient, private wsServices: WebsocketService) { }

  ngOnInit(): void {

    this.http.get<RespMarcadores>('http://localhost:5000/mapa').subscribe((lugares: any) => {
      console.log(lugares);
      this.lugares = lugares;
      this.crearMapa();
    });

    this.escucharSockets();

  }

  escucharSockets() {
    // marcador-nuevo
    this.wsServices.listen('marcador-nuevo').subscribe((marcador: Luugar) => {
      this.agregarMarcador(marcador);
    });

    // marcador-mover
    this.wsServices.listen('marcador-mover').subscribe((marcador: Luugar) => {
      this.markersMapbox[marcador.id].setLngLat([marcador.lng, marcador.lat]);
    });

    // marcador-borrar
    this.wsServices.listen('marcador-borrar').subscribe((id: string) => {
      this.markersMapbox[id].remove();
      delete this.markersMapbox[id];
    });

  }

  crearMapa() {

    (mapboxgl as any).accessToken = 'pk.eyJ1IjoicGFjb3l4IiwiYSI6ImNrcWZ3OWUzMzE5YXYydm56YXJrNDdndWUifQ.JmfRxh6ccD4HGD7iY8dd8g';
    this.mapa = new mapboxgl.Map({
      container: 'mapa',
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-75.75512993582937, 45.349977429009954],
      zoom: 15.8
    });

    for (const [key, marcador] of Object.entries(this.lugares)) {
      this.agregarMarcador(marcador);
    }

  }

  agregarMarcador(marcador: Luugar) {

    const h2 = document.createElement('h2');
    h2.innerText = marcador.nombre;

    const btnBorrar = document.createElement('button');
    btnBorrar.innerText = 'Borrar';

    const div = document.createElement('div');
    div.append(h2, btnBorrar);

    const customPopup = new mapboxgl.Popup({
      offset: 25,
      closeOnClick: false
    }).setDOMContent(div);

    const marker = new mapboxgl.Marker({
      draggable: true, color: marcador.color
    })
      .setLngLat([marcador.lng, marcador.lat])
      .setPopup(customPopup)
      .addTo(this.mapa);

    marker.on('drag', () => {
      const lngLat = marker.getLngLat();
      const nuevoMarcador = {
        id: marcador.id,
        ...lngLat
      };
      this.wsServices.emit('marcador-mover', nuevoMarcador);
    });

    btnBorrar.addEventListener('click', () => {
      marker.remove();
      this.wsServices.emit('marcador-borrar', marcador.id);
    });

    this.markersMapbox[marcador.id] = marker;

  }

  crearMarcador(): void {

    const customMarker: Luugar = {
      id: new Date().toISOString(),
      lat: 45.349977429009954,
      lng: -75.75512993582937,
      color: '#' + Math.floor(Math.random() * 16777215).toString(16),
      nombre: 'sin nombre'
    };

    this.wsServices.emit('marcador-nuevo', customMarker);

    this.agregarMarcador(customMarker);
  }

}
