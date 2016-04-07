/*jshint -W069 */

var jsdom = require("jsdom"),
    tsv = require("node-tsv-json"),
    request = require("request"),
    iconv  = require('iconv-lite'),
    fs = require("fs");

var brokerlist, sources = ["feed", "wfs", "wms"], sourceCount = 0, sourceData = {}, rows = [], row = 0;

tsv({input: "sources/brokerlist.tsv",output: null,parseRows: true}, function(err, result) {
    brokerlist = result;
    loadSource();
});

function loadSource(){
    tsv({input: "sources/"+sources[sourceCount]+".tsv",output: null,parseRows: true}, function(err, result) {
        sourceData[sources[sourceCount]] = result;
        sourceCount++;
        if(sourceCount>=sources.length){
            combineSources();
        }else{
            loadSource();
        }
    });
}

function combineSources(){
    for(var i = 0; i<sources.length; i++){
        for(var j = 0; j<sourceData[sources[i]].length; j++){
            var item = {
                title:sourceData[sources[i]][j][0],
                url:sourceData[sources[i]][j][1],
                type:sources[i]
            };
            rows.push(item);
        }
    }

    getMetaData();
}

function getMetaData(){

    request(
        {
            encoding: null,
            uri: "http://fbinter.stadt-berlin.de/fb/berlin/service.jsp"+rows[row].url,
        },
        function (err, response, body) {
            var Utf8String = iconv.decode(new Buffer(body), "ISO-8859-1");

            jsdom.env({
                html: Utf8String,
                scripts: ["http://code.jquery.com/jquery.js"],
                done: function (err, window) {
                    if(err){
                        console.log(err);
                    }else{
                        var thumb = false, link = false;
                        if(window.$('table').eq(0).find('tr').eq(0).find('td').length===1){
                            link = window.$('table').eq(0).find('tr').eq(0).find('td').eq(0).find('a').eq(0).attr("href");
                        }else{
                            link = window.$('table').eq(0).find('tr').eq(0).find('td').eq(1).find('a').eq(0).attr("href");
                            thumb = window.$('table').eq(0).find('tr').eq(0).find('td img').eq(0).attr("src");
                        }

                        if(link === "undefined"){link = false;}

                        var obj = {
                            type:rows[row].type,
                            title:window.$('h2').text(),
                            thumb:thumb,
                            link:link,
                            description:{
                                link:rows[row].url
                            },
                            anbieter:{
                                adress:false,
                                contact:{telefon:false,fax:false,email:false}
                            },
                            technology:{}
                        };

                        console.log(row, "getMetaData: http://fbinter.stadt-berlin.de/fb/berlin/service.jsp"+rows[row].url, obj.link);

                        var found = false;
                        var image_name = ((!obj.thumb)?"thereisnoimage":(((obj.thumb.split("/"))[(obj.thumb.split("/")).length-1]).split("."))[0]);
                        for(var k = 0; k<brokerlist.length; k++){
                            if(brokerlist[k][2].indexOf(image_name)>=0 ||
                                brokerlist[k][3].indexOf(obj.title)>=0){
                                obj["category"] = brokerlist[k][0];
                                found = true;
                            }
                        }
                        if(!found){console.log("not found",obj.thumb, image_name, obj.title);}

                        var last = false;
                        window.$('table').eq(1).find('tr').each(function(){
                            var that = window.$(this);
                            var key = that.find('td').eq(0).text().trim().toLowerCase();
                            var value = that.find('td').eq(1).text();

                            if(key.substr(key.length-1, 1)===":"){
                                key = key.substr(0,key.length-1);
                            }

                            if(key.length>=1){
                                obj.description[key] = value;
                                last = key;
                            }else if(last){
                                obj.description[last] += "\n"+value;
                            }
                        });

                        window.$('table').eq(2).find('tr').each(function(){
                            var that = window.$(this);
                            var value = that.find('td').eq(0).text().trim();

                            if(value.indexOf("Telefon:")>=0){
                                obj.anbieter.contact.telefon = value.substr((value.indexOf(":")+1), (value.length-value.indexOf(":"))).trim();
                            }else if(value.indexOf("Fax:")>=0){
                                obj.anbieter.contact.fax = value.substr((value.indexOf(":")+1), (value.length-value.indexOf(":"))).trim();
                            }else if(value.indexOf("E-Mail:")>=0){
                                obj.anbieter.contact.email = value.substr((value.indexOf(":")+1), (value.length-value.indexOf(":"))).trim();
                            }else{
                                if(obj.anbieter.adress){
                                    obj.anbieter.adress += "\n";
                                }else{
                                    obj.anbieter.adress = "";
                                }
                                obj.anbieter.adress += value;
                            }
                        });

                        last = false;
                        window.$('table').eq(3).find('tr').each(function(){
                            var that = window.$(this);
                            var key = that.find('td').eq(0).text().trim().toLowerCase();
                            var value = that.find('td').eq(1).text();
                            if(value.indexOf(",")>=0){
                                value = value.split(",");
                            }else{
                                value = [value];
                            }

                            if(key.substr(key.length-1, 1)===":"){
                                key = key.substr(0,key.length-1);
                            }

                            if(key.length>=1){
                                obj.technology[key] = value;
                                last = key;
                            }else if(last){
                                obj.technology[last] = obj.technology[last].concat(value);
                            }
                        });

                        if(obj.type === "feed"){
                            last = false;
                            obj['download'] = {};
                            window.$('table').eq(4).find('tr').each(function(){
                                var that = window.$(this);

                                if(that.find('td').length===1){
                                    obj.download["description"] = that.find('td').eq(0).text();
                                }else{
                                    var key = that.find('td').eq(0).text().trim().toLowerCase();
                                    var value = that.find('td').eq(1).text();

                                    if(key.substr(key.length-1, 1)===":"){
                                        key = key.substr(0,key.length-1);
                                    }

                                    if(key.length>=1){
                                        obj.download[key] = value;
                                        last = key;
                                    }else if(last){
                                        obj.download[last] = obj.download[last].concat(value);
                                    }
                                }
                            });
                        }

                        rows[row] = obj;

                        row++;
                        if(row < rows.length){
                            getMetaData();
                        }else{
                            //just for backup
                            var outputFilename = "sources.json";
                            fs.writeFile(outputFilename, JSON.stringify(rows, null, 4), function(err) {
                                var outputFilename = "sources.min.json";
                                fs.writeFile(outputFilename, JSON.stringify(rows), function(err) {
                                    console.log("done");
                                });
                            });

                            row = 0;
                            getCapabilities();
                        }
                    }
                }
            });
        }
    );
}

function getCapabilities(){
    if(rows[row].type === "feed"){
        nextCapabilities(1);
    }else{
        if("rechneradresse" in rows[row].technology){
            //Remove those that have no url

            request(
                {
                    encoding: null,
                    uri: rows[row].technology.rechneradresse[0]+"?REQUEST=GetCapabilities&version=1&service="+rows[row].type,
                },
                function (err, response, body) {
                    if(err){
                        console.log(err);
                        nextCapabilities(0);
                    }else{

                        console.log("Process:",rows[row].technology.rechneradresse,rows[row].type);

                        switch(rows[row].type){
                            case "wfs":
                                //var Utf8String = iconv.decode(new Buffer(body), "ISO-8859-1");

                                jsdom.env({
                                    html: body,
                                    scripts: ["http://code.jquery.com/jquery.js"],
                                    done: function (err, window) {
                                        if(err){
                                            console.log(err);
                                        }else{
                                            //PROCESSING

                                            rows[row]["keywords"] = [];

                                            window.$('ows\\:Keywords').eq(0).find('ows\\:Keyword').each(function(){
                                                rows[row].keywords.push(window.$(this).text());
                                            });

                                            rows[row].description["beschreibung"] = window.$('ows\\:Abstract').eq(0).text();
                                            rows[row].technology["inspire"] = window.$('inspire_common\\:URL').eq(0).text();

                                            window.$('ows\\:Operations').each(function(){
                                                var op = window.$(this).attr("name");
                                                if(op && op.length >= 1){
                                                    var exists = false;
                                                    for(var i = 0; i<rows[row].technology.operationen.length; i++){
                                                        if(rows[row].technology.operationen[i]===op){
                                                            exists = true;
                                                        }
                                                    }
                                                    if(!exists){
                                                        rows[row].technology.operationen.push(op);
                                                    }
                                                }
                                            });

                                            rows[row]["spatial"] = {
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
                                                rows[row].spatial.operators.comparison.push(window.$(this).attr("name"));
                                            });

                                            window.$('fes\\:GeometryOperand').each(function(){
                                                rows[row].spatial.operators.geometry.push(window.$(this).attr("name"));
                                            });

                                            window.$('fes\\:SpatialOperator').each(function(){
                                                rows[row].spatial.operators.spatial.push(window.$(this).attr("name"));
                                            });

                                            window.$('wfs\\:DefaultCRS').each(function(){
                                                rows[row].spatial.crs.push(window.$(this).text());
                                            });

                                            window.$('wfs\\:OtherCRS').each(function(){
                                                rows[row].spatial.crs.push(window.$(this).text());
                                            });

                                            var lc = window.$('ows\\:LowerCorner').eq(0).text().split(" ");
                                            var uc = window.$('ows\\:UpperCorner').eq(0).text().split(" ");

                                            rows[row].spatial.boundingbox.min_latitude = parseFloat((lc[1]<uc[1])?lc[1]:uc[1]);
                                            rows[row].spatial.boundingbox.max_latitude = parseFloat((lc[1]>uc[1])?lc[1]:uc[1]);
                                            rows[row].spatial.boundingbox.min_longitude = parseFloat((lc[0]<uc[0])?lc[0]:uc[0]);
                                            rows[row].spatial.boundingbox.max_longitude = parseFloat((lc[0]>uc[0])?lc[0]:uc[0]);

                                            nextCapabilities(1);
                                        }
                                    }
                                });
                            break;
                            case "wms":
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

                                            rows[row]["keywords"] = [];

                                            window.$('KeywordList').eq(0).find('Keyword').each(function(){
                                                rows[row].keywords.push(window.$(this).text());
                                            });

                                            rows[row].description["beschreibung"] = window.$('Abstract').eq(0).text();

                                            rows[row].technology["legend"] = {
                                                width:parseInt(window.$('Layer').find('LegendURL').eq(0).attr('width')),
                                                height:parseInt(window.$('Layer').find('LegendURL').eq(0).attr('height')),
                                                format:window.$('Layer').find('LegendURL').eq(0).find('Format').text(),
                                                url:window.$('Layer').eq(0).find('LegendURL').eq(0).find('OnlineResource').eq(0).attr("xlink:href")
                                            };

                                            rows[row].technology["layers"] = [];

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

                                                rows[row].technology.layers.push(layer);
                                            });

                                            nextCapabilities(1);
                                        }
                                    }
                                });
                            break;
                        }

                    }
                }
            );
        }else{
            nextCapabilities(1);
        }
    }
}

function nextCapabilities(plus){
    row+=plus;

    if(row>=rows.length){
        var outputFilename = "sources.json";
        fs.writeFile(outputFilename, JSON.stringify(rows, null, 4), function(err) {
            var outputFilename = "sources.min.json";
            fs.writeFile(outputFilename, JSON.stringify(rows), function(err) {
                console.log("done");
            });
        });
    }else{
        getCapabilities();
    }
}
