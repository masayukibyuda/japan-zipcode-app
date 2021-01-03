import React, { Component } from 'react';
import { Map, Marker, GoogleApiWrapper, InfoWindow } from 'google-maps-react';
import axios from 'axios';
import './App.css';

const MAP_API_KEY = process.env.MAP_API_KEY;
const GEOCODING_API_KEY = process.env.GEOCODING_API_KEY;
const PLACES_API_KEY = process.env.PLACES_API_KEY;

const OPEN_WEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

const DATE_DAY_NAME = [ 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      zipcode: '',

      prefecture: '',
      city: '',
      subcity: '',
      lat: '',
      lng: '',

      weather: null,
      touristAttraction: null,

      activeMarker: {},
      selectedPlace: {},
      showingInfoWindow: false,

      error: null,
    }
  }

  onMarkerClick = (props, marker) =>
    this.setState({
      activeMarker: marker,
      selectedPlace: props,
      showingInfoWindow: true
    });

  onInfoWindowClose = () =>
    this.setState({
      activeMarker: null,
      showingInfoWindow: false
    });

  onMapClicked = () => {
    if (this.state.showingInfoWindow)
      this.setState({
        activeMarker: null,
        showingInfoWindow: false
      });
  };

  displayMarkers = () => {
    return this.state.touristAttraction.map((data, index) => {
      return <Marker key={index} id={index} position={{
       lat: data.lat,
       lng: data.lng
      }}
      name={data.name}
      onClick={this.onMarkerClick} />
    });
  };

  geoCodingAPI() {
    axios({
      method: 'post',
      url: "https://maps.googleapis.com/maps/api/geocode/json?components=country:JP%7Cpostal_code:" + this.state.zipcode + "&key=" + GEOCODING_API_KEY,
      headers: { 
        'content-type': 'application/json', 
      }
    })
    .then(result => {
      if(result.data.status === "OK")
      {
        this.setState({
          prefecture : result.data.results[0].address_components[result.data.results[0].address_components.length - 2].long_name,
          city: result.data.results[0].address_components[result.data.results[0].address_components.length - 3].long_name,
          subcity: result.data.results[0].address_components[result.data.results[0].address_components.length - 4].long_name,
          lat: result.data.results[0].geometry.location.lat,
          lng: result.data.results[0].geometry.location.lng
        });

        this.openWeatherAPI();
        this.getTouristAttraction();
      }
      else
      {
        throw result.data.status;
      }
    })
    .catch(error => {
      this.setState({ 
        error: error 
      });
    });
  }

  openWeatherAPI() {
    axios({
      method: 'post',
      url: "https://api.openweathermap.org/data/2.5/onecall?lat=" + this.state.lat + "&lon=" + this.state.lng + "&units=metric&exclude=current,minutely,hourly&appid=" + OPEN_WEATHER_API_KEY,
      headers: { 
        'content-type': 'application/json', 
      }
    })
    .then(result => {
      let weather = [];

      for(let i = 0; i < 3; ++i)
      {
        let date = new Date(result.data.daily[i].dt * 1000);

        let json = {
          date: date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + DATE_DAY_NAME[date.getDay()],
          status: result.data.daily[i].weather[0].main,
          icon: "http://openweathermap.org/img/w/" + result.data.daily[i].weather[0].icon + ".png",
          tempMin: result.data.daily[i].temp.min,
          tempMax: result.data.daily[i].temp.max
        };

        weather.push(json);
      }

      this.setState({ 
        weather: weather 
      });

    })
    .catch(error => {
      this.setState({ 
        error: error 
      });
    });
  }
  
  getTouristAttraction() {
    axios({
      method: 'post',
      url: "https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=" + this.state.lat + "," + this.state.lng + "&radius=1000&type=tourist_attraction&key=" + PLACES_API_KEY,
      headers: { 'content-type': 'application/json'}
    })
    .then(result => {
      let touristAttraction = [];
      
      let count = result.data.results.length;
      for(let i = 0; i < count; ++i)
      {
        let json = {
          name: result.data.results[i].name,
          lat: result.data.results[i].geometry.location.lat,
          lng: result.data.results[i].geometry.location.lng,
        }

        touristAttraction.push(json);
      }

      this.setState({ 
        touristAttraction: touristAttraction 
      });
    })
    .catch(error => {
      this.setState({ 
        error: error 
      });
    });
  }

  handleFormSubmit( e ) {
    e.preventDefault();

    this.setState({
      prefecture: '',
      city: '',
      subcity: '',
      lat: '',
      lng: '',
      weather: null,
      error: null,
    });

    this.geoCodingAPI();
  }

  render()
  {
    var conditionalRender = null;

    if(this.state.error === "ZERO_RESULTS")
    {
      conditionalRender = 
        <div text-align="center">
          <p align="center">Invalid zip code {this.state.zipcode}.</p>
        </div>
    }
    else if(this.state.error !== null)
    {
      conditionalRender = 
        <div text-align="center">
          <p align="center">Something went wrong.</p>
        </div>
    }
    else if(this.state.prefecture !== '' && this.state.city !== '' && this.state.subcity !== '' && this.state.weather != null && this.state.touristAttraction != null)
    {
      conditionalRender = 
        <div>
          <h1>{this.state.prefecture}, {this.state.city}, {this.state.subcity}</h1>

          <p>3-day forecast</p>

          <div className = "weather-forecast-container">

            <div className = "weather-forecast-item-root">
              <div className = "weather-forecast-item">
                <img className = "weather-forecast-item-icon" src={this.state.weather[0].icon} alt="" />
                <div className = "weather-forecast-item-date">
                  <label>{this.state.weather[0].date}</label>
                </div>
                <div className = "weather-forecast-item-status">
                  <label>{this.state.weather[0].status}</label>
                </div>
                <div className = "weather-forecast-item-temp">
                  <label>Max: {this.state.weather[0].tempMax}&deg; Min: {this.state.weather[0].tempMin}&deg;C</label>
                </div>
              </div>
            </div>

            <div className = "weather-forecast-item-root">
              <div className = "weather-forecast-item">
                <img className = "weather-forecast-item-icon" src={this.state.weather[1].icon} alt="" />
                <div className = "weather-forecast-item-date">
                  <label>{this.state.weather[1].date}</label>
                </div>
                <div className = "weather-forecast-item-status">
                  <label>{this.state.weather[1].status}</label>
                </div>
                <div className = "weather-forecast-item-temp">
                  <label>Max: {this.state.weather[1].tempMax}&deg; Min: {this.state.weather[1].tempMin}&deg;C</label>
                </div>
              </div>
            </div>

            <div className = "weather-forecast-item-root">
              <div className = "weather-forecast-item">
                <img className = "weather-forecast-item-icon" src={this.state.weather[2].icon} alt="" />
                <div className = "weather-forecast-item-date">
                  <label>{this.state.weather[2].date}</label>
                </div>
                <div className = "weather-forecast-item-status">
                  <label>{this.state.weather[2].status}</label>
                </div>
                <div className = "weather-forecast-item-temp">
                  <label>Max: {this.state.weather[2].tempMax}&deg; Min: {this.state.weather[2].tempMin}&deg;C</label>
                </div>
              </div>
            </div>

          </div>

          <div className = "additional-information-root">

            <div className = "google-map">
              <p>Map</p>
              <Map 
                google={this.props.google} 
                zoom={10} 
                initialCenter={{ lat: this.state.lat, lng: this.state.lng }}
                style={{ width: '350px', height: '350px' }}>
                  <Marker position={{ lat: this.state.lat, lng: this.state.lng }} />
              </Map>
            </div>

            <div className = "free-space">
              <p>Tourist Attraction</p>
              <Map 
                google={this.props.google} 
                zoom={14} 
                initialCenter={{ lat: this.state.lat, lng: this.state.lng }}
                style={{ width: '350px', height: '350px' }}
                onClick={this.onMapClicked} >
                  {this.displayMarkers()}
                  <InfoWindow marker={this.state.activeMarker}
                    onClose={this.onInfoWindowClose}
                    visible={this.state.showingInfoWindow}>
                      <div>
                        <h4>{this.state.selectedPlace.name}</h4>
                      </div>
                  </InfoWindow>
              </Map>
            </div>
            
          </div>

        </div>
    }

    return (
      <div className="App">
        <div>
          <label>Postal Code</label>
          <input type="text" id="zipcode" name="zipcode" placeholder="0000000" maxLength="7"
            value={this.state.zipcode.replace(/\D/g, '')}
            onChange={e => this.setState({ zipcode: e.target.value })}
          />
          <input type="submit" onClick={e => this.handleFormSubmit(e)} value="Submit" />
          { conditionalRender }
        </div>
      </div>
    );
  }
}

export default GoogleApiWrapper({
  apiKey: (MAP_API_KEY)
 })(App);