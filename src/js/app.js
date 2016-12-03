var UI = require('ui');
var ajax = require('ajax');

var STATION_LIST = [];
var CURRENT_STATION = {};

var LOADING_WINDOW = new UI.Card({
	title: 'BART Times',
	subtitle: 'Loading...'
});

var STATION_TIMES_WINDOW = new UI.Menu({
	sections: [{ items: [{title: CURRENT_STATION.name}]}]
});

var STATION_LIST_WINDOW = new UI.Menu({
	sections: [{
			title: 'Stations',
			items: []
		}]
});

STATION_TIMES_WINDOW.on('select', function(e) {
	LOADING_WINDOW.show();
	if (e.sectionIndex === 0) {
		renderStationList();
	} else {
		loadStationDetails(CURRENT_STATION);
	}
});

STATION_LIST_WINDOW.on('select', function(e) {
	LOADING_WINDOW.show();
	CURRENT_STATION = {name: e.item.title, abbr: e.item.subtitle};
	loadStationDetails(CURRENT_STATION);
	STATION_LIST_WINDOW.hide();
});

init();

function init() {
	LOADING_WINDOW.show();
	getStationList();
}

function getStationList() {
	ajax({ url: 'http://bart.crudworks.org/api/stations', type: 'json' },
		 function(data, status, req) {
			 STATION_LIST = data;
			 window.navigator.geolocation.getCurrentPosition(locationSuccess, locationError, {'timeout': 15000,'maximumAge': 60000});
		}
	);
}

function locationSuccess(position) {
	CURRENT_STATION = getClosestStation(position.coords);
	loadStationDetails(CURRENT_STATION);
}

function locationError(err) {
	console.warn('location error (' + err.code + '): ' + err.message);
}

function getClosestStation(currentPosition) {
	var closest = STATION_LIST[0];
	var closestDistance = calculateDistance({latitude: parseFloat(closest.gtfs_latitude), longitude: parseFloat(closest.gtfs_longitude)}, currentPosition);
	
	for (var i = 1; i < STATION_LIST.length; i++) {
		var newDistance = calculateDistance({latitude: parseFloat(STATION_LIST[i].gtfs_latitude), longitude: parseFloat(STATION_LIST[i].gtfs_longitude)}, currentPosition);
		if (newDistance < closestDistance) {
			closestDistance = newDistance;
			closest = STATION_LIST[i];
		}
	}
	return closest;
}

function loadStationDetails(currentStation) {
	console.log("loading station details");
	ajax({ url: "http://bart.crudworks.org/api/departures/" + currentStation.abbr, type: 'json' },
		 function(data, status, req) {
			 console.log("successfully loaded station details");
			 if (data.etd) renderMainWindow(data.etd);
		 }
	);
}

function renderMainWindow(stationDetails) {
	var northboundSection = {
		title: 'Northbound',
		items: []
	};

	var southboundSection = {
		title: 'Southbound',
		items: []
	};

	for (var i = 0; i < stationDetails.length; i++) {
		var estimateTimeString = ""; 
		var direction = stationDetails[i].estimate[0].direction;
		var title = CURRENT_STATION.abbr + " → "  + stationDetails[i].abbreviation;
		for (var j = 0; j < stationDetails[i].estimate.length; j++) {
			if (estimateTimeString) {
				estimateTimeString += ", ";
			}
			estimateTimeString += (stationDetails[i].estimate[j].minutes != "Leaving" ? stationDetails[i].estimate[j].minutes + "m/" : "Now/") + stationDetails[i].estimate[j].length + "c"; 
		}
		var item = {
			title: title,
			subtitle: estimateTimeString
		};
		if (direction === "North") {
			northboundSection.items.push(item);
		} else {
			southboundSection.items.push(item);
		}
	}
	STATION_TIMES_WINDOW.item(0, 0, {title: CURRENT_STATION.name, abbr: CURRENT_STATION.abbr});
	STATION_TIMES_WINDOW.section(1, northboundSection);
	STATION_TIMES_WINDOW.section(2, southboundSection);
	STATION_TIMES_WINDOW.show();
	LOADING_WINDOW.hide();
}

function renderStationList() {
	for (var i = 0; i < STATION_LIST.length; i++) {
		var item = {
			title: STATION_LIST[i].name,
			subtitle: STATION_LIST[i].abbr
		};
		STATION_LIST_WINDOW.item(0, i, item);
	}
	STATION_LIST_WINDOW.show();
	LOADING_WINDOW.hide();
}

function calculateDistance(position1, position2){
	var lat1 = parseFloat(position1.latitude);
	var lat2 = parseFloat(position2.latitude);
	var lon1 = parseFloat(position1.longitude);
	var lon2 = parseFloat(position2.longitude);
	var R = 6371000; // metres
	var φ1 = lat1 * Math.PI / 180;
	var φ2 = lat2 * Math.PI / 180;
	var Δφ = (lat2-lat1) * Math.PI / 180;
	var Δλ = (lon2-lon1) * Math.PI / 180;

	var a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
		Math.cos(φ1) * Math.cos(φ2) *
		Math.sin(Δλ/2) * Math.sin(Δλ/2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

	var d = R * c;
	return d;
}