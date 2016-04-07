var fs = require("fs");

var jsons = [];

var files = fs.readdirSync('./moabit/');
for (var i in files) {
    if(files[i].indexOf("min.geojson") >= 0){
        jsons.push(files[i]);
    }
}

var jc = 0;

function convert(){
    var json = JSON.parse(fs.readFileSync("./moabit/"+jsons[jc], 'utf8'));
    var columns = {};
    for(var i = 0; i<json.features.length; i++){
        for(var key in json.features[i].properties){
            if(!(key in columns)){
                columns[key]=true;
            }
        }
    }

    var csv = "";
    for(var key in columns){
        if(csv !== ""){
            csv += ",";
        }
        csv += '"'+clean(key)+'"';
    }
    csv += "\n";

    for(var i = 0; i<json.features.length; i++){
        var line = "";
        for(var key in columns){
            if(line !== ""){
                line += ",";
            }
            if((key in json.features[i].properties)){
                line += '"'+clean(json.features[i].properties[key])+'"';
            }else{
                line += '""';
            }
        }
        csv += line+"\n";
    }

    var name = (jsons[jc].split("."))[0];

    fs.writeFile("moabit/"+name+".csv", csv, function(err) {
        next();
    });
}

function clean(str){
    return str.replace('"', '\"');
}

function next(){
    jc++;
    if(jc<jsons.length){
        convert();
    }else{
        console.log("done");
    }
}

convert();
