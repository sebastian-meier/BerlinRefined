var fs = require('fs'),
    request = require('request');

var download = function(uri, filename, callback){
  request.head(uri, function(err, res, body){
    console.log('content-type:', res.headers['content-type']);
    console.log('content-length:', res.headers['content-length']);

    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
};


var layers = [
        ['k_luftbild2015_cir', '']
];

function processLayers(){
    var layer = layers[currentlayer][0];
    download('http://fbinter.stadt-berlin.de/fb/wms/senstadt/'+layer+'?request=GetMap&service=WMS&version=1.1.1&layers=0&srs=EPSG:4326&format=image/png&width=4908&height=5000&bbox=13.306503295898438,52.51303464932938,13.349504470825195,52.540971446408086&styles=gdi_default', layer+'.png', function(){
        console.log("downloaded "+layer);
        currentlayer++;
        if(currentlayer>=layers.length){
            console.log("done");
        }else{
            processLayers();
        }
    });
}

var currentlayer = 0;

processLayers();
