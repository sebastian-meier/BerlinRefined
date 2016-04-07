var jsdom = require("jsdom"),
    tsv = require("node-tsv-json"),
    request = require("request"),
    iconv  = require('iconv-lite'),
    fs = require("fs");

var json = [];

var row = 1,
    rows;

var techs = ["wfs","wms"],
    tech_count = 0;

function startProcess(){
    tsv(
        {
            input: techs[tech_count]+".tsv",
            output: null,
            parseRows: true
        }, function(err, result) {
            if(err) {
                console.error(err);
            }else {
                rows = result;
                processRow();
            }
        }
    );
}

function processRow(){

    request(
        {
            encoding: null,
            uri: "http://fbinter.stadt-berlin.de/fb/berlin/service.jsp"+rows[row][1],
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
                        var obj = {
                            title:window.$('h2').text(),
                            thumb:window.$('table').eq(0).find('tr').eq(0).find('td img').eq(0).attr("src"),
                            link:window.$('table').eq(0).find('tr').eq(0).find('td').eq(1).find('a').eq(0).attr("href"),
                            description:{},
                            anbieter:{
                                adress:false,
                                contact:{telefon:false,fax:false,email:false}
                            },
                            technology:{}
                        };

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

                        json.push(obj);
                        console.log("done "+obj.link);

                        row++;
                        if(row < rows.length){
                            processRow();
                        }else{
                            var outputFilename = techs[tech_count]+".json";
                            fs.writeFile(outputFilename, JSON.stringify(json, null, 4), function(err) {
                                if(err) {
                                    console.log(err);
                                } else {
                                    if(tech_count===0){
                                        tech_count++;
                                        row=0;
                                        startProcess();
                                    }else{
                                        console.log("done");
                                    }
                                }
                            });
                        }
                    }
                }
            });
        }
    );
}

startProcess();
