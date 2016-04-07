var jsdom = require("jsdom"),
    tsv = require("node-tsv-json"),
    request = require("request"),
    iconv  = require('iconv-lite'),
    json  = require('./wms'),
    fs = require("fs");

var j_count = 0;

function processJson(){
    if("rechneradresse" in json[j_count].technology){
        request(
            {
                encoding: null,
                uri: json[j_count].technology.rechneradresse[0]+"?REQUEST=GetCapabilities&version=1&service=wms",
            },
            function (err, response, body) {
                if(err){
                    console.log(err);
                    nextProcess(0);
                }else{
                    console.log(response.statusCode, response.statusMessage);

                    //var Utf8String = iconv.decode(new Buffer(body), "ISO-8859-1");

                    //Using Style as a tag name is messing things up
                    var Utf8String = iconv.decode(new Buffer(body), "utf8");
                    Utf8String = Utf8String.replace(/<Style>/g,"<LayerStyle>");
                    body = Utf8String.replace(/<\/Style>/g,"</LayerStyle>");

                    jsdom.env({
                        html: body,
                        scripts: ["http://code.jquery.com/jquery.js"],
                        done: function (err, window) {
                            if(err){
                                console.log(err);
                            }else{
                                //PROCESSING

                                json[j_count]["keywords"] = [];

                                window.$('KeywordList').eq(0).find('Keyword').each(function(){
                                    json[j_count].keywords.push(window.$(this).text());
                                });

                                json[j_count].description["beschreibung"] = window.$('Abstract').eq(0).text();

                                json[j_count].technology["legend"] = {
                                    width:parseInt(window.$('Layer').find('LegendURL').eq(0).attr('width')),
                                    height:parseInt(window.$('Layer').find('LegendURL').eq(0).attr('height')),
                                    format:window.$('Layer').find('LegendURL').eq(0).find('Format').text(),
                                    url:window.$('Layer').eq(0).find('LegendURL').eq(0).find('OnlineResource').eq(0).attr("xlink:href")
                                };

                                json[j_count].technology["layers"] = [];

                                window.$('Layer').eq(0).find('Layer').each(function(){
                                    var layer = {
                                        name:window.$(this).find('Name').eq(0).text(),
                                        title:window.$(this).find('Title').eq(0).text(),
                                        abstract:window.$(this).find('Abstract').eq(0).text(),
                                        gdi_de:window.$(this).find('Identifier').eq(0).text(),
                                        metadata:window.$(this).find('MetadataURL').eq(0).find("OnlineResource").eq(0).attr("xlink:href"),
                                        style:{
                                            name:window.$(this).find('LayerStyle').eq(0).find("Name").eq(0).text(),
                                            title:window.$(this).find('LayerStyle').eq(0).find("Title").eq(0).text()
                                        },
                                        legend:{
                                            width:parseInt(window.$(this).find('LegendURL').attr('width')),
                                            height:parseInt(window.$(this).find('LegendURL').attr('height')),
                                            url:window.$(this).find('LegendURL').find('OnlineResource').eq(0).attr("xlink:href"),
                                            format:window.$(this).find('LegendURL').find('Format').eq(0).text()
                                        },
                                        scalehint:{
                                            min:parseInt(window.$(this).find('ScaleHint').eq(0).attr('min')),
                                            max:parseInt(window.$(this).find('ScaleHint').eq(0).attr('max'))
                                        },
                                        keywords:[],
                                        srs:[]
                                    };

                                    window.$(this).find('KeywordList').eq(0).find('Keyword').each(function(){
                                        layer.keywords.push(window.$(this).text());
                                    });

                                    window.$(this).find('BoundingBox').each(function(){
                                        var srs = {
                                            name:window.$(this).attr("SRS"),
                                            boundingbox:{
                                                min_latitude:parseFloat(window.$(this).attr("miny")),
                                                max_latitude:parseFloat(window.$(this).attr("maxy")),
                                                min_longitude:parseFloat(window.$(this).attr("minx")),
                                                max_longitude:parseFloat(window.$(this).attr("maxx"))
                                            }
                                        };

                                        layer.srs.push(srs);
                                    });

                                    json[j_count].technology.layers.push(layer);
                                });

                                console.log("Process:",json[j_count].technology.rechneradresse);

                                nextProcess(1);
                            }
                        }
                    });
                }
            }
        );
    }else{
        nextProcess(1);
    }

}

function nextProcess(plus){
    j_count+=plus;

    if(j_count>=json.length){
        var outputFilename = "wms_ext.json";
        fs.writeFile(outputFilename, JSON.stringify(json, null, 4), function(err) {
            if(err) {
                console.log(err);
            } else {
                console.log("done");
            }
        });
    }else{
        processJson();
    }
}

processJson();
