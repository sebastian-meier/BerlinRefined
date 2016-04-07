/*jshint -W004 */
/*jshint -W069 */

var jsdom = require("jsdom"),
    tsv = require("node-tsv-json"),
    x2jsLib = require("x2js"),
    request = require("request"),
    iconv  = require('iconv-lite'),
    fs = require("fs"),
    proj4 = require("proj4"),
    sources = require("./sources");

    var x2js = new x2jsLib();

var EPSG_25833 = [369097.8529,5799298.1358,416865.038,5838236.2097];
var EPSG_25833_w = EPSG_25833[2]-EPSG_25833[0];
var EPSG_25833_h = EPSG_25833[3]-EPSG_25833[1];
var EPSG_25833_r = EPSG_25833_w/EPSG_25833_h;

var h = 1;
var w = EPSG_25833_r;

var EPSG_4326 = [13.079,52.3284,13.7701,52.6877];
var EPSG_4326_w = EPSG_4326[2]-EPSG_4326[0];
var EPSG_4326_h = EPSG_4326[3]-EPSG_4326[1];
var EPSG_4326_r = EPSG_4326_w/EPSG_4326_h;

var EPSG_4326_wr = w/EPSG_4326_w;
var EPSG_4326_hr = h/EPSG_4326_h;

console.log(EPSG_4326_wr,EPSG_4326_hr);

//EPSG_4326_r === EPSG_25833_r in width

//wfs:true
var allowed = {wms:true};

//var prefix = "";
var prefix = "berlin_";

proj4.defs([
    ["EPSG:25833","+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs"],
    ["EPSG:4258","+proj=longlat +ellps=GRS80 +no_defs"],
    ["EPSG:3068","+proj=cass +lat_0=52.41864827777778 +lon_0=13.62720366666667 +x_0=40000 +y_0=10000 +ellps=bessel +datum=potsdam +units=m +no_defs"],
    ["EPSG:4326","+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs"]
]);

//var astr = [13.306503295898438,52.51303464932938,13.349504470825195,52.540971446408086];
var astr = [13.079,52.3284,13.7701,52.6877];

var sourceCount = 967;
var sourceLayer = 0;

function getSource(){
    console.log("getSource",sourceCount, sourceLayer, sources.length);
    var s = sources[sourceCount];
    if(("rechneradresse" in s.technology)){
        if(s.type === "wms" && "wms" in allowed){

            var l = s.technology.layers[sourceLayer];

            var srs = false;

            var srss = [25833,3068,4258,4326];

            var bb = [];

            for(var j = 0; j<srss.length; j++){
                if(!srs){
                    for(var i = 0;i<l.srs.length;i++){
                        if(l.srs[i].name.indexOf(srss[j])>=0 && !srs){
                            srs = "EPSG:"+srss[j];
                            bb = [
                                l.srs[i].boundingbox.min_longitude,
                                l.srs[i].boundingbox.min_latitude,
                                l.srs[i].boundingbox.max_longitude,
                                l.srs[i].boundingbox.max_latitude
                            ];
                        }
                    }
                }
            }

            if(!srs){
                console.log("unknown srs.. using default.. good luck");
                srs = "EPSG:25833";
                bb = [
                    l.srs[0].boundingbox.min_longitude,
                    l.srs[0].boundingbox.min_latitude,
                    l.srs[0].boundingbox.max_longitude,
                    l.srs[0].boundingbox.max_latitude
                ];
            }

            //Size of map container
            var target_s = 3000;

            var p1 = proj4("EPSG:4326",srs,[astr[0],astr[1]]);
            var p2 = proj4("EPSG:4326",srs,[astr[2],astr[3]]);

            //Check if out of range
            if(
                (p1[0] < bb[0] && p2[0] < bb[0])||
                (p1[0] > bb[2] && p2[0] > bb[2])||
                (p1[1] < bb[1] && p2[1] < bb[1])||
                (p1[1] > bb[3] && p2[1] > bb[3])
            ){
                console.log("Out of range");
                next();
            }else{
                //Decrease BB to layer BB
                if(p1[0] < bb[0]){
                    p1[0] = bb[0];
                }

                if(p2[0] > bb[2]){
                    p2[0] = bb[2];
                }

                if(p1[1] < bb[1]){
                    p1[1] = bb[1];
                }

                if(p2[1] > bb[3]){
                    p2[1] = bb[3];
                }

                var pp1 = proj4(srs,"EPSG:4326",p1);
                var pp2 = proj4(srs,"EPSG:4326",p2);

                var target_w = pp2[0]-pp1[0];
                var target_h = pp2[1]-pp1[1];

                var th = target_h*EPSG_4326_hr;
                var tw = target_w*EPSG_4326_wr;

                var multi = ((tw>th)?(target_s/tw):(target_s/th));

                console.log(tw*multi ,th*multi);

                var bbstring = p1[0]+","+p1[1]+","+p2[0]+","+p2[1];

                //The resolution is calculated through size and extent, which means zooming out while maintaining the same size leads to unsupported resolution
                //To avoid this we need to upscale the size
                //multi *= 1;

                var image = s.technology.rechneradresse[0]+"?request=GetMap&service=wms&transparent=true&version=1.1.1&layers="+l.name+"&srs="+srs+"&format=image/png&width="+Math.round(multi*tw)+"&height="+Math.round(multi*th)+"&bbox="+bbstring+"&styles="+l.style.name;

                var name = ((s.technology.rechneradresse[0].split("/"))[(s.technology.rechneradresse[0].split("/")).length-1])+"_"+l.name;

                console.log(image);

                download(image, 'moabit/'+prefix+name+".png", function(err){
                    next();
                });

            }
        }else if(s.type === "wfs" && "wfs" in allowed){
            var srs = false;

            var srss = [25833,3068,4258,4326];

            var bb = [
                s.spatial.boundingbox.min_longitude,
                s.spatial.boundingbox.min_latitude,
                s.spatial.boundingbox.max_longitude,
                s.spatial.boundingbox.max_latitude
            ];

            for(var j = 0; j<srss.length; j++){
                if(!srs){
                    for(var i = 0;i<s.spatial.crs.length;i++){
                        if(s.spatial.crs[i].indexOf(srss[j])>=0){
                            srs = "EPSG:"+srss[j];
                        }
                    }
                }
            }

            if(!srs){
                console.log("unknown srs.. using default.. good luck", s.spatial.crs);
                srs = "EPSG:25833";
            }

            var p1 = proj4("EPSG:4326",srs,[astr[0],astr[1]]);
            var p2 = proj4("EPSG:4326",srs,[astr[2],astr[3]]);

            var sid = s.technology.rechneradresse[0].split("/");
            var id = sid[(sid.length-1)];

               var url = "http://prjcts.sebastianmeier.eu/berlin/fisbroker.php?p1="+s.technology.rechneradresse[0]+"&p2="+id+"&p3=99999999&p4="+p1[0]+","+p1[1]+","+p2[0]+","+p2[1]+"&p5="+srs;

            request(
                {
                    encoding: null,
                    uri: url,
                },
                function (err, response, body) {
                    if(err){
                        console.log(err);
                        next();
                    }else{

                        var Utf8String = iconv.decode(new Buffer(body), "utf8");
                        //Utf8String = Utf8String.replace(/<Style>/g,"<LayerStyle>");
                        //body = Utf8String.replace(/<\/Style>/g,"</LayerStyle>");

                        var json = x2js.xml2js(Utf8String);

                        if("ServiceExceptionReport" in json){
                            console.log(json.ServiceExceptionReport.ServiceException._code, json.ServiceExceptionReport.ServiceException.__text);
                            next();
                        }else if("ExceptionReport" in json){
                            console.log(json.ExceptionReport.Exception._exceptionCode, json.ExceptionReport.Exception.ExceptionText.__text);
                            next();
                        }else if(parseInt(json.FeatureCollection._numberReturned)>=1){

                            var geojson = {
                                'type': "FeatureCollection",
                                'features': [

                                ]
                            };

                            for(var o = 0; o<json.FeatureCollection.member.length; o++){
                                var obj = json.FeatureCollection.member[o][id];
                                var d = {
                                    'type':'Feature',
                                    'geometry': {
                                        'type':false,
                                        'coordinates':[]
                                    },
                                    'properties':{}
                                };

                                for(var key in obj){
                                    if(key.substr(0,7)!=="spatial" && key.substr(0,1)!=="_"){
                                        d.properties[key] = obj[key].__text;
                                    }
                                }

                                d.properties["alias"] = obj.spatial_alias.__text;

                                var type = obj.spatial_type.__text;

                                /*gml:AbstractGeometricAggregate
                                gml:curveMembers
                                gml:geometryMember
                                gml:geometryMembers
                                gml:MultiCurve
                                gml:MultiGeometry
                                gml:MultiPoint
                                gml:MultiSolid
                                gml:MultiSurface
                                gml:pointMember
                                gml:pointMembers
                                gml:solidMember
                                gml:solidMembers
                                gml:surfaceMembers*/

                                switch(type){
                                    case "Point":

                                        var geom = obj.spatial_geometry[type];
                                        d.geometry.type = "Point";
                                        var pos = geom.pos.__text.split(" ");
                                        d.geometry.coordinates = proj4(geom._srsName,"EPSG:4326",[parseFloat(pos[0]), parseFloat(pos[1])]);

                                    break;
                                    case "LineString":

                                        d.geometry.type = "LineString";
                                        if("MultiCurve" in obj.spatial_geometry){
                                            if("curveMember" in obj.spatial_geometry.MultiCurve){
                                                var geom = obj.spatial_geometry.MultiCurve.curveMember.LineString;
                                                var line = [];
                                                for(var i = 0; i<geom.pos.length; i++){
                                                    var pos = geom.pos[i].__text.split(" ");
                                                    line.push(proj4(geom._srsName,"EPSG:4326",[parseFloat(pos[0]), parseFloat(pos[1])]));
                                                }

                                                d.geometry.coordinates = line;
                                            }else{
                                                console.log("probably curveMembers");
                                            }
                                        }else if("LineString" in obj.spatial_geometry){
                                            var geom = obj.spatial_geometry.LineString;
                                            var line = [];
                                            for(var i = 0; i<geom.pos.length; i++){
                                                var pos = geom.pos[i].__text.split(" ");
                                                line.push(proj4(geom._srsName,"EPSG:4326",[parseFloat(pos[0]), parseFloat(pos[1])]));
                                            }

                                            d.geometry.coordinates = line;
                                        }else{
                                            console.log(obj.spatial_geometry);
                                        }

                                    break;
                                    case "Polygon":

                                        d.geometry.type = "Polygon";
                                        if("Polygon" in obj.spatial_geometry){
                                            var geom = obj.spatial_geometry.Polygon.exterior.LinearRing;
                                            var line = [];
                                            for(var i = 0; i<geom.pos.length; i++){
                                                var pos = geom.pos[i].__text.split(" ");
                                                line.push(proj4(geom._srsName,"EPSG:4326",[parseFloat(pos[0]), parseFloat(pos[1])]));
                                            }

                                            d.geometry.coordinates = [line];

                                        }else if("MultiSurface" in obj.spatial_geometry){
                                            if("surfaceMember" in obj.spatial_geometry.MultiSurface){
                                                if(Object.prototype.toString.call( obj.spatial_geometry.MultiSurface.surfaceMember ) === '[object Array]'){
                                                    d.geometry.type = "MultiPolygon";
                                                    var line = [];
                                                    for(var j = 0; j<obj.spatial_geometry.MultiSurface.surfaceMember.length; j++){
                                                        var l = [];
                                                        var geom = obj.spatial_geometry.MultiSurface.surfaceMember[j].Polygon.exterior.LinearRing;
                                                        for(var i = 0; i<geom.pos.length; i++){
                                                            var pos = geom.pos[i].__text.split(" ");
                                                            l.push(proj4(geom._srsName,"EPSG:4326",[parseFloat(pos[0]), parseFloat(pos[1])]));
                                                        }
                                                        line.push(l);
                                                    }

                                                    d.geometry.coordinates = [line];

                                                }else{
                                                    var geom = obj.spatial_geometry.MultiSurface.surfaceMember.Polygon.exterior.LinearRing;
                                                    var line = [];
                                                    for(var i = 0; i<geom.pos.length; i++){
                                                        var pos = geom.pos[i].__text.split(" ");
                                                        line.push(proj4(geom._srsName,"EPSG:4326",[parseFloat(pos[0]), parseFloat(pos[1])]));
                                                    }

                                                    d.geometry.coordinates = [line];
                                                }

                                            }else{
                                                console.log("probably surfaceMembers");
                                            }
                                        }else{
                                            console.log(obj.spatial_geometry);
                                        }

                                    break;
                                    default:

                                        console.log("unknown type", type);

                                    break;
                                }

                                if(d.geometry.coordinates.length>=1){
                                    geojson.features.push(d);
                                }

                            }

                            var name = ((s.technology.rechneradresse[0].split("/"))[(s.technology.rechneradresse[0].split("/")).length-1]);
                            var outputFilename = "moabit/"+prefix+name+".geojson";
                            fs.writeFile(outputFilename, JSON.stringify(geojson, null, 4), function(err) {
                                var outputFilename = "moabit/"+prefix+name+".min.geojson";
                                fs.writeFile(outputFilename, JSON.stringify(geojson), function(err) {
                                    next();
                                });
                            });


                        }else{

                            console.log("empty result");
                            next();
                        }
                    }

                }
            );

        }else{
            console.log("skip", s.type);
            next();
        }
    }else{
        console.log("no rechneradresse", s.type);
        next();
    }
}

function download(uri, filename, callback){
    request.head(uri, function(err, res, body){
        if(err){
            console.log(err);
            next();
        }
        console.log('content-type:', res.headers['content-type']);
        console.log('content-length:', res.headers['content-length']);

        request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
}

function next(){
    if(!("layers" in sources[sourceCount].technology)){
        nxt();
    }else{
        sourceLayer++;
        if(sourceLayer<sources[sourceCount].technology.layers.length){
            getSource();
        }else{
            nxt();
        }
    }
}

function nxt(){
    sourceCount++;
    sourceLayer = 0;
    if(sourceCount<sources.length){
        getSource();
    }else{
        console.log("DONE");
    }
}

getSource();
