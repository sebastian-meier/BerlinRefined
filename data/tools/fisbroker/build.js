var fs = require("fs"),
    sources = require("./sources.min.json");

var overview = "---"+"\n"+
    "layout: default"+"\n"+
    "title: Moabit - Overview"+"\n"+
    "permalink: /pages/moabit/overview"+"\n"+
    "level: 2"+"\n"+
    "---"+"\n"+
    "<div class='container'><h1>Moabit Datasets Overview</h1>"+"\n";

//acquire categories
var categories = [];
for(var i = 0; i<sources.length; i++){
    var exists = false;
    for(var j = 0; j<categories.length && !exists; j++){
        if(categories[j] === sources[i].category){ exists = true;}
    }
    if(!exists){
        categories.push(sources[i].category);
    }
}

categories.sort();

var skips = 0;

overview += "<div class='datasets-nav'>"+"\n"+
            "<ul>"+"\n";
for(i = 0; i<categories.length; i++){
    overview += "<li><a href='#"+categories[i]+"'>"+categories[i]+"</a></li>"+"\n";
}
overview += "</ul></div>"+"\n";

for(i = 0; i<categories.length; i++){
    overview += "<div class='datasets-group'>"+"\n"+
                "<h2><a name='"+categories[i]+"'>"+categories[i]+"</a></h2>"+"\n"+
                "<ul>"+"\n";

    for(j = 0; j<sources.length; j++){
        if(sources[j].category === categories[i]){
            var skip = false;
            if(sources[j].type === "feed"){
                var name = ((sources[j].description.link.split("@"))[0].split("="))[1];
            }else{
                if("rechneradresse" in sources[j].technology){
                    var name = ((sources[j].technology.rechneradresse[0].split("/"))[(sources[j].technology.rechneradresse[0].split("/")).length-1]);
                }else{
                    skip = true;
                }
            }

            if(!skip){
                if(sources[j].type === "wms"){
                    skip = !checkIfExists('moabit/berlin_'+((sources[j].technology.rechneradresse[0].split("/"))[(sources[j].technology.rechneradresse[0].split("/")).length-1])+"_"+sources[j].technology.layers[0].name+".png");
                }else if(sources[j].type === "wfs"){
                    skip = !checkIfExists("moabit/"+((sources[j].technology.rechneradresse[0].split("/"))[(sources[j].technology.rechneradresse[0].split("/")).length-1])+".geojson");
                }

                if(!skip){
                    var url = "{{site.url}}/pages/moabit/details/"+sources[j].type+"_"+name+".html";
                    overview += "<li>"+"\n"+
                                "<div class='dataset-thumb'>";
                    if(sources[j].thumb && sources[j].thumb.length >= 1){
                        overview += "<a href='"+url+"'><img src='"+sources[j].thumb+"'></a>";
                    }
                    overview += "</div>"+"\n"+
                                "<span class='dataset-type'>"+sources[j].type+"</span>"+"\n"+
                                "<span class='dataset-title'><a href='"+url+"'>"+sources[j].title+"</a></span>"+"\n"+
                                "</li>"+"\n";

                    var legend = false;

                    var page = "---"+"\n"+
                        "layout: default"+"\n"+
                        "title: Moabit - "+"\n"+
                        "permalink: /pages/moabit/details/"+sources[j].type+"_"+name+"\n"+
                        "level: 3"+"\n"+
                        "---"+"\n"+
                        "<div class='container'><h1>"+sources[j].title+"</h1>"+"\n"+
                        "<div id='moabit_map'></div>"+"\n"+
                        "<div id='berlin_map'></div>"+"\n"+
                        "<div id='description'>"+"\n"+
                            "<table>"+"\n"+
                                "<tr><th>Type</th><td>"+sources[j].type+"</td></tr>"+"\n"+
                                "<tr><th>Title</th><td>"+sources[j].title+"</td></tr>"+"\n"+
                                "<tr><th>Category</th><td>"+sources[j].category+"</td></tr>"+"\n"+
                                "<tr><th>Download</th><td>";

                    if(sources[j].type === "wfs"){
                        page += "<a href='"+((sources[j].technology.rechneradresse[0].split("/"))[(sources[j].technology.rechneradresse[0].split("/")).length-1])+".min.geojson'>Min.GeoJson</a><br />"+"\n";
                        page += "<a href='"+((sources[j].technology.rechneradresse[0].split("/"))[(sources[j].technology.rechneradresse[0].split("/")).length-1])+".geojson'>GeoJson</a>"+"\n";
                    }else if(sources[j].type === "wms"){
                        page += "See individual layer for download link."+"\n";
                    }else{
                        page += "See description for download link."+"\n";
                    }

                    page +=     "</td></tr>"+"\n"+
                                "<!--<tr><th>Preview</th><td><img src='"+sources[j].thumb+"'></td></tr>-->"+"\n"+
                                "<tr><th>FisBroker-Link</th><td><a href='"+sources[j].link+"'>"+sources[j].link+"</a></td></tr>"+"\n"+
                                "<tr><th>Keywords</th><td>";

                        if(sources[j].keywords){
                            for(var k = 0; k<sources[j].keywords.length; k++){
                                if(k>0){page += ",";}
                                page += sources[j].keywords[k];
                            }
                        }

                        page += "</td></tr>"+"\n"+"<tr><th colspan='2'><strong>Beschreibung</strong></th></tr>"+"\n";

                                for(var key in sources[j].description){
                                    page += "<tr><th>"+key+"</th><td>"+sources[j].description[key]+"</td></tr>"+"\n";
                                }

                                page += "<tr><th colspan='2'><strong>Anbieter</strong></th></tr>"+"\n"+
                                        "<tr><th>Adress</th><td>"+sources[j].anbieter.adress.replace("\n", "<br />")+"</td></tr>"+"\n";

                                for(var key in sources[j].anbieter.contact){
                                    if(sources[j].anbieter.contact[key]){
                                        page += "<tr><th>"+key+"</th><td>"+sources[j].anbieter.contact[key]+"</td></tr>"+"\n";
                                    }
                                }

                        page += "<tr><th colspan='2'><strong>Technology</strong></th></tr>"+"\n";

                        for(var key in sources[j].technology){
                            if(key != "layers"){
                                page += "<tr><th>"+key+"</th><td>";
                                if(typeof sources[j].technology[key] === "object"){
                                    for(var k = 0; k<sources[j].technology[key].length; k++){
                                        if(k>0){page += "<br />";}
                                        page += sources[j].technology[key][k];
                                    }
                                }else{
                                    page += sources[j].technology[key];
                                }
                                page += "</td></tr>"+"\n";
                            }
                        }

                        switch(sources[j].type){
                            case 'wfs':

                                page += "<tr><th colspan='2'><strong>Spatial</strong></th></tr>"+"\n";
                                page += "<tr><th>BoundingBox</th><td>"+sources[j].spatial.boundingbox.min_latitude+","+sources[j].spatial.boundingbox.min_longitude+","+sources[j].spatial.boundingbox.max_latitude+","+sources[j].spatial.boundingbox.max_longitude+"</td></tr>"+"\n";

                                page += "<tr><th>Projections</th><td>";
                                for(var k = 0; k<sources[j].spatial.crs.length; k++){
                                    if(k>0){page += "<br />";}
                                    page += sources[j].spatial.crs[k];
                                }
                                page += "</td></tr>"+"\n";
                                for(var key in sources[j].spatial.operators){
                                    page += "<tr><th>"+key+"</th><td>";
                                    for(var k = 0; k<sources[j].spatial.operators[key].length; k++){
                                        if(k>0){page += "<br />";}
                                        page += sources[j].spatial.operators[key][k];
                                    }
                                    page += "</td></tr>"+"\n";

                                }
                            break;
                            case 'wms':
                                page += "<tr><th colspan='2'><strong>Layers</strong></th></tr>"+"\n";

                                for(var l = 0; l<sources[j].technology.layers.length; l++){
                                    var layer = sources[j].technology.layers[l];
                                    page += "<tr><th colspan='2'><strong class='layer'>"+layer.title+" (ID: "+layer.name+")</strong></th></tr>"+"\n";
                                    page += "<tr><th></th><td><a data-layer='"+layer.name+"' class='layer_selector'>Show Layer on Map</a></td></tr>"+"\n";

                                    page += "<tr><th>Download</th><td>";
                                    page += "<a href='{{site.url}}/data/tools/fisbroker/moabit/"+((sources[j].technology.rechneradresse[0].split("/"))[(sources[j].technology.rechneradresse[0].split("/")).length-1])+"_"+layer.name+".png'>Moabit Karte</a><br />"+"\n";
                                    page += "<a href='{{site.url}}/data/tools/fisbroker/moabit/berlin_"+((sources[j].technology.rechneradresse[0].split("/"))[(sources[j].technology.rechneradresse[0].split("/")).length-1])+"_"+layer.name+".png'>Berlin Karte</a>"+"\n";

                                    page += "<tr><th>Abstract</th><td>"+layer.abstract+"</td></tr>"+"\n"+
                                            "<tr><th>MetaData</th><td>"+layer.metadata+"</td></tr>"+"\n"+
                                            "<tr><th>GDI ID</th><td>"+layer.gdi_id+"</td></tr>"+"\n"+
                                            "<tr><th>Style</th><td>"+layer.style.title+" ("+layer.style.name+")</td></tr>"+"\n"+
                                            "<tr><th>Legend</th><td>"+layer.legend.url+" ("+layer.legend.width+"x"+layer.legend.height+")</td></tr>"+"\n"+
                                            "<tr><th>ScaleHint</th><td>"+layer.scalehint.min+"-"+layer.scalehint.max+"</td></tr>"+"\n"+
                                            "<tr><th>Keywords</th><td>";

                                    if(!legend){
                                        legend = {};
                                    }
                                    legend[layer.name] = layer.legend.url;

                                    for(var k = 0; k<layer.keywords.length; k++){
                                        if(k>0){page += ",";}
                                        page += layer.keywords[k];
                                    }

                                    page += "</td></tr>"+"\n";

                                    for(var s = 0; s<layer.srs.length; s++){
                                        page += "<tr><th>BoundingBox</th><td>"+layer.srs[s].name+" ("+layer.srs[s].boundingbox.min_latitude+","+layer.srs[s].boundingbox.min_longitude+","+layer.srs[s].boundingbox.max_latitude+","+layer.srs[s].boundingbox.max_longitude+")</td></tr>"+"\n";
                                    }
                                }

                            break;
                            case 'feed':

                                page += "<tr><th colspan='2'><strong>Download</strong></th></tr>"+"\n";
                                for(var key in sources[j].download){
                                    page += "<tr><th>"+key+"</th><td>"+sources[j].download[key].replace("\n", "<br />")+"</td></tr>"+"\n";
                                }

                            break;
                            default:
                                console.log("ooops");
                            break;
                        }

                    page += "</table>"+"\n"+
                            "</div>"+"\n"+
                            "<div id='legend'>";

                            if(legend){
                                for(var key in legend){
                                    page += "<img class='legend' id='legend_"+key+"' src='"+legend[key]+"' />";
                                }
                            }

                    page += "</div></div>"+"\n"+
                            "<link rel='stylesheet' href='{{site.url}}/lib/leaflet.css' />"+"\n"+
                            "<script src='{{site.url}}/lib/d3.min.js'></script>"+"\n"+
                            "<script src='{{site.url}}/lib/topojson.v1.min.js'></script>"+"\n"+
                            "<script src='{{site.url}}/lib/leaflet.js'></script>"+"\n"+
                            "<script src='{{site.url}}/lib/leaflet.ajax.min.js'></script>"+"\n"+
                            "<script language='text/javascript'>"+"\n";
                            //Init maps

                    if(sources[j].type === "feed"){
                        page += "d3.selectAll('#moabit_map, #berlin_map').remove();"+"\n";
                    }else if(sources[j].type === "wms"){

                        page += "var berlin_map = L.map('berlin_map').setView([((52.6854-52.3348)/2+52.3348), ((13.7607-13.0847)/2+13.0847)], 12);"+"\n"+
                                "var moabit_map = L.map('moabit_map').setView([((52.540971446408086-52.51303464932938)/2+52.51303464932938), ((13.349504470825195-13.306503295898438)/2+13.306503295898438)], 12);"+"\n"+
                                "var osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';"+"\n"+
                                "var osmAttrib='Map data © <a href=\'http://openstreetmap.org\'>OpenStreetMap</a> contributors';"+"\n"+
                                "var osm = new L.TileLayer(osmUrl, {attribution: osmAttrib});"+"\n"+
                                "osm.addTo(berlin_map);"+"\n"+
                                "osm.addTo(moabit_map);"+"\n"+
                                "var name = '"+((sources[j].technology.rechneradresse[0].split("/"))[(sources[j].technology.rechneradresse[0].split("/")).length-1])+"_';"+"\n"+
                                "var southWest = L.latLng(52.51303464932938, 13.306503295898438),northEast = L.latLng(52.540971446408086, 13.349504470825195), moabit_bounds = L.latLngBounds(southWest, northEast);"+"\n"+
                                "var moabit_overlay = L.imageOverlay('{{site.url}}/data/tools/fisbroker/moabit/'+name+'"+sources[j].technology.layers[0].name+".png', moabit_bounds);"+"\n"+
                                "moabit_overlay.addTo(moabit_map);"+"\n"+
                                "moabit_map.fit(moabit_bounds);"+"\n"+
                                "var southWest = L.latLng(52.3348, 13.0847),northEast = L.latLng(52.6854, 13.7607),berlin_bounds = L.latLngBounds(southWest, northEast);"+"\n"+
                                "var berlin_overlay = L.imageOverlay('{{site.url}}/data/tools/fisbroker/moabit/berlin_'+name+'"+sources[j].technology.layers[0].name+".png', berlin_bounds);"+"\n"+
                                "berlin_overlay.addTo(berlin_map);"+"\n"+
                                "berlin_map.fit(berlin_bounds);"+"\n"+
                                "d3.select('img.legend#legend_"+sources[j].technology.layers[0].name+"').show();"+"\n";

                        page += "d3.selectAll('.layer_selector').on('click',function(){"+"\n"+
                                    "var el = d3.select(this);"+"\n"+
                                    "var id = el.attr('data-layer');"+"\n"+
                                    "berlin_map.remove(berlin_overlay);"+"\n"+
                                    "moabit_map.remove(moabit_overlay);"+"\n"+
                                    "moabit_overlay = L.imageOverlay('{{site.url}}/data/tools/fisbroker/moabit/'+name+id+'.png', moabit_bounds);"+"\n"+
                                    "moabit_overlay.addTo(moabit_map);"+"\n"+
                                    "berlin_overlay = L.imageOverlay('{{site.url}}/data/tools/fisbroker/moabit/berlin_'+name+id+'.png', berlin_bounds);"+"\n"+
                                    "berlin_overlay.addTo(berlin_map);"+"\n"+
                                    "d3.select('img.legend').hide();"+"\n"+
                                    "d3.select('img.legend#legend_'+id).show();"+"\n"+
                                "});"+"\n";

                    }else if(sources[j].type === "wfs"){
                        page += "var moabit_map = L.map('moabit_map').setView([((52.540971446408086-52.51303464932938)/2+52.51303464932938), ((13.349504470825195-13.306503295898438)/2+13.306503295898438)], 12);"+"\n"+
                                "var osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';"+"\n"+
                                "var osmAttrib='Map data © <a href=\'http://openstreetmap.org\'>OpenStreetMap</a> contributors';"+"\n"+
                                "var osm = new L.TileLayer(osmUrl, {attribution: osmAttrib});"+"\n"+
                                "osm.addTo(moabit_map);"+"\n"+
                                "function onEachFeature(feature, layer) {layer.bindPopup(JSON.stringify(feature.properties, null, 4));}"+"\n"+
                                "var geojsonMarkerOptions = {radius: 5,fillColor: '#ff7800',color: '#000',weight: 1,opacity: 1,fillOpacity: 0.8};"+"\n"+
                                "var name = '"+((sources[j].technology.rechneradresse[0].split("/"))[(sources[j].technology.rechneradresse[0].split("/")).length-1])+"';"+"\n"+
                                "var geojsonLayer = new L.GeoJSON.AJAX('{{site.url}}'+name+'.min.geojson',{pointToLayer: function (feature, latlng) {return L.circleMarker(latlng, geojsonMarkerOptions);},onEachFeature: onEachFeature});"+"\n"+
                                "geojsonLayer.addTo(moabit_map);"+"\n";
                    }

                    page += "</script>";

                    fs.writeFileSync("../../../pages/moabit/details/"+sources[j].type+"_"+name+".html", page);

                }else{

                    console.log("skip");
                    skips++;
                    if(sources[j].type === "wms"){
                        console.log('moabit/'+((sources[j].technology.rechneradresse[0].split("/"))[(sources[j].technology.rechneradresse[0].split("/")).length-1])+"_"+sources[j].technology.layers[0].name+".png");
                    }else if(sources[j].type === "wfs"){
                        console.log("moabit/"+((sources[j].technology.rechneradresse[0].split("/"))[(sources[j].technology.rechneradresse[0].split("/")).length-1])+".geojson");
                    }

                }
            }
        }
    }
    overview += "</ul>"+"\n"+
                "</div>"+"\n";
}
overview += "</div>"+"\n";

fs.writeFile("../../../pages/moabit/overview.html", overview, function(err) {
    console.log("done",skips);
});

function checkIfExists(filePath){
    try{
        fs.statSync(filePath);
    }catch(err){
        if(err.code == 'ENOENT') return false;
    }
    return true;
}
