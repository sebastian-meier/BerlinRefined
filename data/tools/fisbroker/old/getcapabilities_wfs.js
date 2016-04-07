var jsdom = require("jsdom"),
    tsv = require("node-tsv-json"),
    request = require("request"),
    iconv  = require('iconv-lite'),
    json  = require('./wfs'),
    fs = require("fs");

var j_count = 0;

function processJson(){
    if("rechneradresse" in json[j_count].technology){
        request(
            {
                encoding: null,
                uri: json[j_count].technology.rechneradresse[0]+"?REQUEST=GetCapabilities&version=1&service=wfs",
            },
            function (err, response, body) {
                if(err){
                    console.log(err);
                    nextProcess(0);
                }else{
                    console.log(response.statusCode, response.statusMessage);

                    //var Utf8String = iconv.decode(new Buffer(body), "ISO-8859-1");

                    jsdom.env({
                        html: body,
                        scripts: ["http://code.jquery.com/jquery.js"],
                        done: function (err, window) {
                            if(err){
                                console.log(err);
                            }else{
                                //PROCESSING

                                json[j_count]["keywords"] = [];

                                window.$('ows\\:Keywords').eq(0).find('ows\\:Keyword').each(function(){
                                    json[j_count].keywords.push(window.$(this).text());
                                });

                                json[j_count].description["beschreibung"] = window.$('ows\\:Abstract').eq(0).text();
                                json[j_count].technology["inspire"] = window.$('inspire_common\\:URL').eq(0).text();

                                window.$('ows\\:Operations').each(function(){
                                    var op = window.$(this).attr("name");
                                    if(op && op.length >= 1){
                                        var exists = false;
                                        for(var i = 0; i<json[j_count].technology.operationen.length; i++){
                                            if(json[j_count].technology.operationen[i]===op){
                                                exists = true;
                                            }
                                        }
                                        if(!exists){
                                            json[j_count].technology.operationen.push(op);
                                        }
                                    }
                                });

                                json[j_count]["spatial"] = {
                                    boundingbox:{
                                        min_latitude:false,
                                        max_latitude:false,
                                        min_longitude:false,
                                        max_longitude:false
                                    },
                                    crs:[],
                                    operators:{
                                        comparison:[],
                                        geometry:[],
                                        spatial:[]
                                    }
                                };

                                window.$('fes\\:ComparisonOperator').each(function(){
                                    json[j_count].spatial.operators.comparison.push(window.$(this).attr("name"));
                                });

                                window.$('fes\\:GeometryOperand').each(function(){
                                    json[j_count].spatial.operators.geometry.push(window.$(this).attr("name"));
                                });

                                window.$('fes\\:SpatialOperator').each(function(){
                                    json[j_count].spatial.operators.spatial.push(window.$(this).attr("name"));
                                });

                                window.$('wfs\\:DefaultCRS').each(function(){
                                    json[j_count].spatial.crs.push(window.$(this).text());
                                });

                                window.$('wfs\\:OtherCRS').each(function(){
                                    json[j_count].spatial.crs.push(window.$(this).text());
                                });

                                var lc = window.$('ows\\:LowerCorner').eq(0).text().split(" ");
                                var uc = window.$('ows\\:UpperCorner').eq(0).text().split(" ");

                                json[j_count].spatial.boundingbox.min_latitude = parseFloat((lc[1]<uc[1])?lc[1]:uc[1]);
                                json[j_count].spatial.boundingbox.max_latitude = parseFloat((lc[1]>uc[1])?lc[1]:uc[1]);
                                json[j_count].spatial.boundingbox.min_longitude = parseFloat((lc[0]<uc[0])?lc[0]:uc[0]);
                                json[j_count].spatial.boundingbox.max_longitude = parseFloat((lc[0]>uc[0])?lc[0]:uc[0]);

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
        var outputFilename = "wfs_ext.json";
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
