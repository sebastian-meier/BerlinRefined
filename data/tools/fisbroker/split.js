var fs = require("fs"),
    sources = require("./sources.min.json");

var i = 0;

function split(){
    var name = ((sources[i].description.link.split("&"))[0].split("="))[1];
    var outputFilename = "./singleSources/"+sources[i].type+"."+name;
    fs.writeFile(outputFilename+".json", JSON.stringify(sources[i], null, 4), function(err) {
        fs.writeFile(outputFilename+".min.json", JSON.stringify(sources[i]), function(err) {
            console.log(name);
            i++;
            if(i<sources.length){
                split();
            }else{
                console.log("done");
            }
        });
    });
}

split();
