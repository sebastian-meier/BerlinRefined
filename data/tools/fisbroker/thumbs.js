var http = require('http'),
    fs = require('fs'),
    sources = require('./sources');

var s = 0;

var download = function() {
    if("thumb" in sources[s] && sources[s].thumb.length >= 1){
        var name = ((sources[s].thumb).split("/"))[(((sources[s].thumb).split("/")).length-1)];
        console.log(s, name);

        var file = fs.createWriteStream("./thumbs/original/"+name);
        var request = http.get(sources[s].thumb, function(response) {
            response.pipe(file);
            file.on('finish', function() {
                file.close();
                s++;
                if(s<sources.length){
                    setTimeout(download(), 10);
                }else{
                    process.exit();
                }
            });
        }).on('error', function(err) { // Handle errors
            fs.unlink(dest); // Delete the file async. (But we don't check the result)
            if (cb) cb(err.message);
        });
    }else{
        console.log(s, "no name");
        s++;
        if(s<sources.length){
            setTimeout(download(), 10);
        }else{
            process.exit();
        }
    }
};

download();
