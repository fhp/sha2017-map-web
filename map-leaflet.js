var config;
var map;
var layerSwitcher = null;
var locationMarker = null;
var lastLocation = null;


function initMap() {
    var bounds = L.latLngBounds([config.extents[0], config.extents[1]],
                                [config.extents[2], config.extents[3]]);

    var baseMaps = { 'OpenStreetMap':
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        opacity: 0.3,
        maxZoom: config.zoom_range[1],
        maxNativeZoom: 18,
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    })};

    var overlayMaps = {};

    config.layers.forEach(function(layerName) {
        var layer = L.tileLayer('/tiles/' + layerName + '/{z}/{x}/{y}.png',{
            minZoom: config.zoom_range[0],
            maxZoom: config.zoom_range[1],
            bounds: bounds,
            attribution: '&copy; SHA2017'
        });
        overlayMaps[layerName] = layer;
    });

    map = L.map('map', {
        zoom: 17,
        center: [52.28, 5.52],
        layers: [baseMaps['OpenStreetMap'], overlayMaps['base']],
    });
    new L.Hash(map);
    layerSwitcher = L.control.layers(baseMaps, overlayMaps).addTo(map);
    L.control.scale({maxWidth: 200}).addTo(map);

    map.on('locationfound', function(e) {
        if (locationMarker == null) {
            locationMarker = L.circle(e.latlng, {color: '#136AEC',
                                                          fillColor: '#2A93EE',
                                                          fillOpacity: 0.3,
                                                          weight: 1,
                                                          opacity: 0.9,
                                                          radius: 10}).addTo(map);
        }
        lastLocation = e;
        updateLocationMarker();
    });

    map.on('locationerror', function(e) {
        if (locationMarker != null) {
            locationMarker.remove();
            locationMarker = null;
        }
    });

    map.locate({enableHighAccuracy: true, watch: true})

    $.getJSON('/vector_layers.json', addVectorLayers);
}

function parseTarget(qs) {
    if (qs[0] == '?') qs = qs.substring(1);
    var lat = null;
    var lon = null;
    var title = null;

    var bits = qs.split('&');
    var lat_re = /^lat=[0-9.-]+$/;
    var lon_re = /^lon=[0-9.-]+$/;
    var title_re = /^title=[a-zA-Z0-9 ]+$/;

    for (var i = 0; i < bits.length; i++) {
        bit = decodeURIComponent(bits[i]);
        if (lat_re.test(bit)) {
            lat = Number(bit.split('=')[1]);
        } else if (lon_re.test(bit)) {
            lon = Number(bit.split('=')[1]);
        } else if (title_re.test(bit)) {
            title = bit.split('=')[1];
        }
    }
    if ((lat == null) || (lon == null)) return;

    return [[lat, lon], title];
}

function onGeoJSONFeature(feature, layer) {
    if (feature.properties && feature.properties.distro_name) {
        layer.bindPopup("<b>Name:</b> " + feature.properties.distro_name + "<br>" +
                        "<b>Type:</b> " + feature.properties.power_distro);
    }
}

function addVectorLayers(layer_data) {
    console.log(layer_data);
    $.each(layer_data, function(index, layer) {
        $.getJSON('/vector/' + layer.source, function(data) {
            addGeoJSON(data, layer.name);
        });
    });
}

function addGeoJSON(data, name) {
    var layer = L.geoJson(data, {
        style: {
            color: "#ff0000",
            weight: 2
        },
        pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng, {
                                  radius: 4,
                                  fillColor: "#ff0000",
                                  fillOpacity: 1,
                                  });
        }
        //onEachFeature: onGeoJSONFeature
    });
    layerSwitcher.addOverlay(layer, name + " (vector)");
}

function updateLocationMarker() {
    if (locationMarker != null) {
        locationMarker.setRadius(lastLocation.accuracy);
        locationMarker.setLatLng(lastLocation.latlng);
    }
}

$(function() {
    $.getJSON('/config.json', function(data) {
        config = data;
        initMap();
    })
});


