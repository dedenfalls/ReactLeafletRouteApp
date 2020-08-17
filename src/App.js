/* eslint-disable no-restricted-globals */
import React, { Component } from 'react';
import './App.css';
import L from 'leaflet';
import { Map, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';


var pointIcon = L.icon({
  iconUrl: "/diamond.png",
  iconSize: [50, 50],
  iconAnchor: [12.5, 40],
  popupAnchor: [0, -40]
})
var pointIcon2 = L.icon({
  iconUrl: "/star.png",
  iconSize: [50, 50],
  iconAnchor: [12.5, 40],
  popupAnchor: [0, -40]
})
var vehicleIcon = L.icon({
  iconUrl: "/vehicle.png",
  iconSize: [50, 50],
  iconAnchor: [12.5, 40],
  popupAnchor: [0, -40]
})

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      lat: 39.891854,
      lng: 32.783477,
      zoom: 13,
      showMap: false,
      addRoute: false,
      listRoutes: false,
      selected: [],
      crits: [],
      isCritic: false,
      routes: [],
      nexId: 0,
      isUpdate: false,
      activeId: null,
      defaultDescription: "",
      defaultName: "",
      vehicleLat: 39.89,
      vehicleLng: 32.78,
      nextPoint: 0,
      distToNextPoint: 0,
      distToArrive: 0,
      timeToNextPoint: 0,
      timeToArrive: 0,
      vehicleSpeed: 0,

    }
    this.timer = null
    this.stepsLeft = 40
    this.added = false
    this.deleted = false
    this.updateState = false
  }
  async getAllRoutes() {
    const response =
      await fetch("/findAllRoutes",
        { headers: { 'Content-Type': 'application/json' } }
      )
    const res = await response.json()
    var max = 0;
    for (var i = 0; i < res.length; i++) {
      if (res[i].id > max) {
        max = res[i].id
      }
    }
    var flag = false
    if (res.length !== this.state.routes.length) {
      flag = true
    }
    if (flag) {
      this.setState({ routes: res, nexId: max + 1 })
    }
    else {
      for (let i = 0; i < res.length; i++) {
        const element = res[i];
        if (element !== this.state.routes[i]) {
          flag = true
        }

      }
      if (flag) {
        this.setState({ routes: res, nexId: max + 1 })
      }
    }

  }
  componentWillUnmount() {
    clearInterval(this.timer)
  }
  componentDidUpdate() {
    if (this.deleted || this.added) {
      this.deleted = false
      this.added = false
      this.getAllRoutes()
    }
  }
  componentDidMount() {
    this.getAllRoutes()
  }
  selectPoint = (point) => {
    var comment = null
    if (this.state.selected.length > 0) {
      comment = prompt("You may add a comment for leg to be constructed")

    }
    this.setState({ selected: [...this.state.selected, [point.latlng.lat, point.latlng.lng, comment]] })
  }
  addCrit = (point) => {
    var critName = prompt('Name', '');
    var critType = prompt('Type', '');
    alert('Name = ' + critName + '\nType = ' + critType);
    this.setState({ crits: [...this.state.crits, [point.latlng.lat, point.latlng.lng, critName, critType]] })

  }
  makeCrit = () => {
    if (!this.state.isCritic) {
      document.getElementById("criticalButton").style.color = "red"
    }
    else {
      document.getElementById("criticalButton").style.color = "black"
    }
    this.setState({ isCritic: !this.state.isCritic })
  }
  clearMap = () => {
    this.setState({ crits: [], selected: [], defaultDescription: "", defaultName: "" })
  }
  addRoute = () => {
    const name = document.getElementById("Name").value;
    const desc = document.getElementById("Desc").value;
    alert("Route " + name + " with description " + desc + " added to database")

    var obj = {}
    if (this.state.activeId !== null) {
      obj.id = this.state.activeId
    } else {
      obj.id = this.state.nexId;
    }
    obj.name = name;
    obj.description = desc;
    obj.routePoints = []
    this.state.selected.forEach(element => {
      obj.routePoints.push({ "x": element[0], "y": element[1], "comment": element[2] })
    });
    obj.p = []

    this.state.crits.forEach(element => {
      obj.p.push({
        "coordinate": {
          "x": element[0],
          "y": element[1]
        },
        "name": element[2],
        "type": element[3]
      })
    });
    var requestOptions
    if (this.state.isUpdate) {
      requestOptions = {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(obj)
      }
      fetch('/update', requestOptions)
        .then(response => console.log(response))
      this.added = true
      this.setState({ addRoute: false, activeId: null, isUpdate: false, showMap: false, listRoutes: true, defaultDescription: "", defaultName: "" })
    }
    else {
      requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(obj)
      }
      fetch('/addRoute', requestOptions)
        .then(response => console.log(response))
      this.added = true
      this.setState({ addRoute: true })
    }
    this.updateState = false
  }
  calculateVehicleCoord = () => {
    const { nextPoint, selected, vehicleLat, vehicleLng } = this.state;
    var latDif = selected[nextPoint][0] - vehicleLat
    var lngDif = selected[nextPoint][1] - vehicleLng
    var dist = (latDif) ** 2 + (lngDif) ** 2
    dist = Math.sqrt(dist) // in degrees
    if (this.stepsLeft > 0) {
      var latSpeed = latDif / this.stepsLeft
      var lngSpeed = lngDif / this.stepsLeft

      var vehicleSpeed = Math.sqrt((latSpeed) ** 2 + (lngSpeed) ** 2)// in degrees
      const timeToNextPoint = dist / vehicleSpeed / 4 //seconds

      var arriveLat = selected[selected.length - 1][0] - vehicleLat
      var arriveLng = selected[selected.length - 1][1] - vehicleLng
      var distToArrive = Math.sqrt(arriveLat ** 2 + arriveLng ** 2)// in degrees
      const timeToArrive = distToArrive / vehicleSpeed / 4 //seconds
      distToArrive *= 111000 // meters
      dist *= 111000 // meters
      vehicleSpeed *= 111000 * 4 * 3.6 // km/h
      this.stepsLeft--
      this.setState({ vehicleLat: vehicleLat + latSpeed, vehicleLng: vehicleLng + lngSpeed, vehicleSpeed: vehicleSpeed, timeToArrive: timeToArrive, timeToNextPoint: timeToNextPoint, distToNextPoint: dist, distToArrive: distToArrive })
    }
    else {
      this.stepsLeft = 40
      if (nextPoint > selected.length - 2) {
        clearInterval(this.timer)
        this.setState({ vehicleSpeed: 0, timeToArrive: 0, timeToNextPoint: 0, distToArrive: 0, distToNextPoint: 0 })
        return
      }
      else {
        this.setState({ nextPoint: nextPoint + 1 })
        this.calculateVehicleCoord()
      }
    }


  }
  setActive(route, index) {
    const holderPoint = []
    for (let i = 0; i < this.state.routes[index].routePoints.length; i++) {
      const element = this.state.routes[index].routePoints[i];
      holderPoint.push([element.x, element.y, element.comment])
    }
    const holderCrit = []
    for (let i = 0; i < this.state.routes[index].p.length; i++) {
      const element = this.state.routes[index].p[i];
      holderCrit.push([element.coordinate.x, element.coordinate.y, element.name, element.type])
    }
    this.setState({ showMap: true, listRoutes: false, selected: holderPoint, crits: holderCrit, defaultDescription: route.description, defaultName: route.name })
    if (!this.updateState) {
      this.timer = setInterval(this.calculateVehicleCoord, 250)
    }

  }
  deleteRoute(route) {
    if (confirm("Confirm to delete " + route.name)) {
      fetch("/delete/" + route.id, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
    }
    else {
      alert("Cancelled the deletion of " + route.name)
    }
    this.deleted = true
    this.forceUpdate()
  }
  undoPoint = () => {
    const { selected } = this.state;
    this.setState({ selected: selected.slice(0, -1) })
  }
  undoCrit = () => {
    const { crits } = this.state;
    this.setState({ crits: crits.slice(0, -1) })
  }
  render() {
    const position = [this.state.lat, this.state.lng]
    if (!this.state.showMap) {
      return (
        <div>
          <button onClick={() => { this.setState({ listRoutes: !this.state.listRoutes }) }}>list routes</button>
          {this.state.listRoutes &&
            <ul>
              {this.state.routes.map((route, index) => {
                return <li key={route.id}>
                  <h2>{route.id} , {route.name} , {route.description}</h2>
                  <button onClick={() => {
                    this.deleteRoute(route)
                  }}>Delete</button>
                  <button onClick={() => {
                    this.updateState = true
                    this.setState({ addRoute: false, isUpdate: true, activeId: route.id })
                    this.setActive(route, index)

                  }}>Update</button>
                  <button onClick={() => {
                    this.setState({ addRoute: false, isUpdate: false })
                    this.setActive(route, index)

                  }}>Set as Active</button>
                </li>
              })}
            </ul>

          }
          <button onClick={() => { this.setState({ showMap: true, addRoute: true }) }}>add new route</button>
        </div>
      )
    }
    else if (this.state.addRoute || this.state.isUpdate) {
      return (
        <div className="App">
          <div className="inputArea">
            <input type="text" defaultValue={this.state.defaultName} name="Name" id="Name" placeholder="Enter a Name for the route" />
            <input type="text" defaultValue={this.state.defaultDescription} name="Desc" id="Desc" placeholder="Enter a Description for the route" />
            <button onClick={this.clearMap}>Clear </button>
            <button id="criticalButton" onClick={this.makeCrit}>Set Critical Points </button>
            <button onClick={this.addRoute}>Add </button> &nbsp;
            {this.state.selected.length > 0 && <button onClick={this.undoPoint}>Undo Last Point</button>}
            &nbsp; {this.state.crits.length > 0 && <button onClick={this.undoCrit}>Undo Last Critical Point</button>}
          </div>
          <div className="mapArea">
            <br></br>
            <Map className="map" center={position} zoom={this.state.zoom} onClick={this.state.isCritic ? this.addCrit : this.selectPoint}>
              <TileLayer
                attribution='&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {this.state.selected.map((nokta, index) => (
                <Marker key={index} position={nokta} icon={pointIcon}>
                  <Popup className="popup">
                    <b>Route point</b> <br></br>
                    lat: {nokta[0]} <br></br> long: {nokta[1]}
                  </Popup>
                </Marker>

              ))}
              {this.state.selected.map(function (nokta, index, array) {
                if (index < array.length - 1) {
                  return <Polyline key={index}
                    positions={[[array[index][0], array[index][1]], [array[index + 1][0], array[index + 1][1]]
                    ]} color='red' weight="10">
                    <Popup className="popup">
                      <b>Route leg</b> <br></br>
                      {array[index + 1][2]}
                    </Popup>
                  </Polyline>

                }
                return null
              })}
              {this.state.crits.map((nokta, index) => (
                <Marker key={index} position={[nokta[0], nokta[1]]} icon={pointIcon2}>
                  <Popup className="popup">
                    <b>Critical point</b> <br></br>
                    {nokta[2]} <br></br> {nokta[3]}
                  </Popup>
                </Marker>

              ))}
            </Map>
          </div>
          <button onClick={() => {
            this.updateState = false
            this.setState({ showMap: false, listRoutes: true, defaultDescription: "", defaultName: "", isUpdate: false, activeId: null, isCritic: false })
          }}>Go Back</button>
        </div>
      )
    }
    else {
      return (
        <div className="mapArea">
          <div className="mapContainer">
            <Map className="map" center={position} zoom={this.state.zoom} >
              <TileLayer
                attribution='&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[this.state.vehicleLat, this.state.vehicleLng]} icon={vehicleIcon}>
                <Popup>
                  <b>Vehicle</b> <br></br>
                lat: {this.state.vehicleLat} <br></br> long: {this.state.vehicleLng}
                </Popup>
              </Marker>
              {this.state.selected.map((nokta, index) => (
                <Marker key={index} position={[nokta[0], nokta[1]]} icon={pointIcon}>
                  <Popup className="popup">
                    {index !== 0 && index !== this.state.selected.length - 1 && <b>Route point</b>}
                    {index === 0 && <b>Start point</b>}
                    {index === this.state.selected.length - 1 && <b>End point</b>}
                    <br></br>
                lat: {nokta[0]} <br></br> long: {nokta[1]}
                  </Popup>
                </Marker>

              ))}
              {this.state.selected.map(function (nokta, index, array) {
                if (index < array.length - 1) {
                  return <Polyline key={index}
                    positions={[[array[index][0], array[index][1]], [array[index + 1][0], array[index + 1][1]]
                    ]} color='red' weight="10">
                    <Popup className="popup">
                      <b>Route leg</b> <br></br>
                      {array[index + 1][2]}
                    </Popup>
                  </Polyline>

                }
                return null
              })}
              {this.state.crits.map((nokta, index) => (
                <Marker key={index} position={[nokta[0], nokta[1]]} icon={pointIcon2}>
                  <Popup className="popup">
                    <b>Critical point</b> <br></br>
                    {nokta[2]} <br></br> {nokta[3]}
                  </Popup>
                </Marker>

              ))}
            </Map>
          </div>
          <div className="stats">
            <h3 className="statElements">
              <div className="s1">
                Speed is <br></br> {parseFloat(this.state.vehicleSpeed).toFixed(2)} km/h,
              </div>
              <div className="s1">
                Time to next point <br></br> {parseFloat(this.state.timeToNextPoint).toFixed(2)} seconds,
              </div>
              <div className="s1">
                Distance to next point <br></br>{parseFloat(this.state.distToNextPoint).toFixed(2)} meters,
              </div>
              <div className="s1">
                Time to arrive <br></br> {parseFloat(this.state.timeToArrive).toFixed(2)} seconds,
              </div>
              <div className="s1">
                Distance to arrive <br></br> {parseFloat(this.state.distToArrive).toFixed(2)} meters,
              </div>

            </h3>
            <button onClick={() => {
              clearInterval(this.timer)
              this.setState({ showMap: false, listRoutes: true, defaultDescription: "", defaultName: "", isUpdate: false, activeId: null, nextPoint: 0 })
            }}>Go Back</button>
          </div>
        </div>

      )
    }
  }
}

