// Dependencies
var L = require("leaflet");
require("leaflet-routing-machine")
require("lrm-graphhopper");

const graphHopper_API_KEY = '0b84e13a-400d-4259-9700-44b9846f2730'

// Variables
var buttonEnabledColor = "#118611";
var buttonDisabledColor = "#000000";

var placingStart = false;
var placingEnd = false;

var bikeType = 'mtb';

var startPos = L.latLng(59.3897465876298, 24.667310714721683);
var endPos = L.latLng(59.401501085264385, 24.73350763320923);

var currentRoute;

// Elements/Objects
const placingStartButton = document.getElementById("place-start");
const placingEndButton = document.getElementById("place-end");
const startAddressInput = document.getElementById("start-address-input-box");
const endAddressInput = document.getElementById("end-address-input-box");
const regularBikeSelection = document.getElementById("regular-bike-option");
const mtbBikeSelection = document.getElementById("mtb-bike-option");
const racingBikeSelection = document.getElementById("racing-bike-option");
const StartCoordShowcase = document.getElementById("start-point-coords");
const EndCoordShowcase = document.getElementById("end-point-coords");
const recentLocationsHeader = document.getElementById("recent-locations-tag");
const savedLocationsHeader = document.getElementById("saved-locations-tag");
const map = L.map('map').setView([59.4339, 24.744], 13);

//functions
function reloadRoute()
{
    if (currentRoute) {currentRoute.remove();}
    currentRoute = L.Routing.control({
        waypoints: [
            startPos,
            endPos
        ],
        router: L.Routing.graphHopper(graphHopper_API_KEY,
        { urlParameters: {
            vehicle: bikeType,
            locale: 'en'
        }}),
        routeWhileDragging: true,
        fitSelectedRoutes: true,
        addWaypoints: false
    }).addTo(map);
}

function updateLocationShowcase()
{
    const startCoordAddress = fetchCoordsToAddress(startPos.lat,startPos.lng);
    const endCoordsAddress = fetchCoordsToAddress(endPos.lat,endPos.lng);

    startCoordAddress.then(
        function(value)
        {
            StartCoordShowcase.textContent = hitToAddressString(value[0].hits[0]) + "\n" + startPos.lat + ", " + startPos.lng;
        },
        function(error)
        {
            console.assert("start: ",error)
        }
    );
    endCoordsAddress.then(
        function(value)
        {
            EndCoordShowcase.textContent = hitToAddressString(value[0].hits[0]) + "\n" + endPos.lat + ", " + endPos.lng;
        },
        function(error)
        {
            console.assert("end: ",error)
        }
    );

    
    
}

async function fetchCoordsToAddress(lat,lng)
{
    const startTime = new Date().getTime();

    const query = new URLSearchParams({
        point: (lat + "," + lng),
        reverse: true,
        locale: 'en',
        limit: '1',
        key: graphHopper_API_KEY
    }).toString();
      
    const resp = await fetch(
        `https://graphhopper.com/api/1/geocode?${query}`,
        {method: 'GET'}
    );

    const jsonTableString = await resp.text();

    const finishTime = new Date().getTime() - startTime;

    return [JSON.parse(jsonTableString), finishTime];
}

async function fetchAddressAutofill(text)
{

    const startTime = new Date().getTime();

    const query = new URLSearchParams({
        q: text,
        locale: 'en',
        limit: '5',
        key: graphHopper_API_KEY
    }).toString();
      
    const resp = await fetch(
        `https://graphhopper.com/api/1/geocode?${query}`,
        {method: 'GET'}
    );

    const jsonTableString = await resp.text();

    const finishTime = new Date().getTime() - startTime;

    return [text, JSON.parse(jsonTableString), finishTime];
}

function updateAddressAutocompleteDatalist(datalist_id,displaynames)
{
    const AddressAutocompleteDatalist = document.getElementById(datalist_id);

    AddressAutocompleteDatalist.textContent = '';

    displaynames.forEach(name =>
    {
        const nextAutocompleteOption = document.createElement("option");
        const optionText = document.createTextNode(name);
        nextAutocompleteOption.appendChild(optionText);

        AddressAutocompleteDatalist.appendChild(nextAutocompleteOption);
    });
}

function toggleStartButton()
{
    placingStart = !placingStart;
    placingEnd = (placingStart) ? false : placingEnd;
    placingEndButton.style.color = (placingEnd) ? buttonEnabledColor : buttonDisabledColor;
    placingStartButton.style.color = (placingStart) ? buttonEnabledColor : buttonDisabledColor;
}

function toggleEndButton()
{
    placingEnd = !placingEnd;
    placingStart = (placingEnd) ? false : placingStart;
    placingEndButton.style.color = (placingEnd) ? buttonEnabledColor : buttonDisabledColor;
    placingStartButton.style.color = (placingStart) ? buttonEnabledColor : buttonDisabledColor;
}

function hitToAddressString(hit)
{
    if (!hit) {return "";};
    var nextDisplayName = hit.name;
    
    if (hit.housenumber)
    {
        nextDisplayName += " " + hit.housenumber;
    }
    else if (hit.house_number)
    {
        nextDisplayName += " " + hit.house_number;
    };

    nextDisplayName += ",";

    if (hit.postcode)
    {
        nextDisplayName += " " + hit.postcode;
    };

    if (hit.city)
    {
        nextDisplayName += " " + hit.city;
    };

    if (hit.state)
    {
        nextDisplayName += " " + hit.state;
    };

    if (hit.postcode || hit.city || hit.state)
    {
        nextDisplayName += ",";
    };

    nextDisplayName += " " + hit.country;

    return nextDisplayName;
}

function createAddressInputListener(element,datalist_id,start)
{
    var lastResultTable = [];
    var lastDisplayNames = [];

    element.addEventListener("input", function(e)
    {
        if (e.target.value.length > 1 && (e.inputType === "insertText" || e.inputType === "deleteContentBackward"))
        {
            const autofill_result = fetchAddressAutofill(e.target.value);
    
            autofill_result.then(
                function(value)
                {
                    if (value[0] === e.target.value)
                    {
                        // console.log(value);
                        lastResultTable = value
    
                        // (name) (house number), (postcode) (city), (country)
                        const hitDisplayNames = [];
                        value[1].hits.forEach(hit => 
                        {
                            const nextDisplayName = hitToAddressString(hit);
    
                            hitDisplayNames.push(nextDisplayName);
                        })
    
                        console.log(hitDisplayNames);
                        lastDisplayNames = hitDisplayNames;
                        updateAddressAutocompleteDatalist(datalist_id,hitDisplayNames);
                    }
                    else
                    {
                        console.warn("late reply:",value[0],value[2]);
                    };
                },
                
                function(error) {console.assert(error)}
            );
        };
        if (e.inputType === "insertReplacementText")
        {
            const coords = lastResultTable[1].hits[lastDisplayNames.indexOf(e.target.value)].point;

            if (start)
            {
                startPos = L.latLng(coords.lat,coords.lng);
            }
            else
            {
                endPos = L.latLng(coords.lat,coords.lng);
            }
            reloadRoute();
            updateLocationShowcase();
        };
    })
}

// Funny stuff
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: ''
}).addTo(map);

map.on('click', function(e) {
    var coord = e.latlng;
    var lat = coord.lat;
    var lng = coord.lng;
    console.log("You clicked the map at latitude: " + lat + " and longitude: " + lng);
    if (placingStart) { startPos = L.latLng(lat,lng); console.log("placingStart",lat,lng); toggleStartButton(); reloadRoute(); updateLocationShowcase(); }
    if (placingEnd) { endPos = L.latLng(lat,lng); console.log("placingEnd",lat,lng); toggleEndButton(); reloadRoute(); updateLocationShowcase(); }
});

placingStartButton.onclick = toggleStartButton
placingEndButton.onclick = toggleEndButton

createAddressInputListener(startAddressInput,"start-autocomplete-datalist",true);
createAddressInputListener(endAddressInput,"end-autocomplete-datalist",false);