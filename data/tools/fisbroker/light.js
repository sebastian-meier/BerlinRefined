var wfs  = require('./wfs_ext'),
    wms  = require('./wms_ext'),
    fs = require("fs");

//This is the simplest way of getting a map from fis-broker and thereby the minimum requirement of parameters:
//http://fbinter.stadt-berlin.de/fb/wms/senstadt/k_luftbild2015_cir?request=GetMap&service=WMS&version=1.1.1&layers=0&srs=EPSG:4326&format=image/png&width=4908&height=5000&bbox=13.306503295898438,52.51303464932938,13.349504470825195,52.540971446408086&styles=gdi_default

var json = [];

for(var i = 0; i<wfs.length; i++){
    if(wfs[i].technology.rechneradresse && wfs[i].technology.rechneradresse[0]){
        var bb = [
            parseFloat(wfs[i].spatial.boundingbox.min_longitude),
            parseFloat(wfs[i].spatial.boundingbox.min_latitude),
            parseFloat(wfs[i].spatial.boundingbox.max_longitude),
            parseFloat(wfs[i].spatial.boundingbox.max_latitude)
        ];

        json.push([
            "wfs",
            wfs[i].technology.rechneradresse[0],
            //We add the following two for searchability
            wfs[i].title,
            wfs[i].description.kurzbeschreibung,
            wfs[i].keywords,
            bb,
            wfs[i].spatial.crs
        ]);
    }
}

for(var i = 0; i<wms.length; i++){
    if(wms[i].technology.rechneradresse && wms[i].technology.rechneradresse[0]){
        var layers = [];
        for(var l = 0; l<wms[i].technology.layers.length; l++){
            var bb = [], srs = false;

            for(var s = 0; s<wms[i].technology.layers[l].srs.length; s++){
                if (wms[i].technology.layers[l].srs[s].name==="EPSG:4258") {
                    srs = "EPSG:4258";
                    bb = [
                        parseFloat(wms[i].technology.layers[l].srs[s].boundingbox.min_longitude),
                        parseFloat(wms[i].technology.layers[l].srs[s].boundingbox.min_latitude),
                        parseFloat(wms[i].technology.layers[l].srs[s].boundingbox.max_longitude),
                        parseFloat(wms[i].technology.layers[l].srs[s].boundingbox.max_latitude)
                    ];
                }else if(wms[i].technology.layers[l].srs[s].name==="EPSG:4326" && bb.length === 0){
                    srs = "EPSG:4326";
                    bb = [
                        parseFloat(wms[i].technology.layers[l].srs[s].boundingbox.min_longitude),
                        parseFloat(wms[i].technology.layers[l].srs[s].boundingbox.min_latitude),
                        parseFloat(wms[i].technology.layers[l].srs[s].boundingbox.max_longitude),
                        parseFloat(wms[i].technology.layers[l].srs[s].boundingbox.max_latitude)
                    ];
                }
            }

            layers.push([
                wms[i].technology.layers[l].name,
                wms[i].technology.layers[l].title,
                wms[i].technology.layers[l].style.name,
                bb,
                srs
            ]);
        }

        json.push([
            "wms",
            wms[i].technology.rechneradresse[0],
            //We add the following two for searchability
            wms[i].title,
            wms[i].description.kurzbeschreibung,
            wms[i].keywords,
            layers,
            wms[i].technology.legend.url
        ]);
    }
}

var outputFilename = "light.json";
fs.writeFile(outputFilename, JSON.stringify(json), function(err) {
    if(err) {
        console.log(err);
    } else {
        console.log("done");
    }
});
