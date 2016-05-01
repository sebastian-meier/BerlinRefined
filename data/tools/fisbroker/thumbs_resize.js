var fs = require('fs'),
    im = require('imagemagick'),
    sources = require('./sources');

var s = 0;

function resize(){
    if("thumb" in sources[s] && sources[s].thumb.length >= 1){
        var name = ((sources[s].thumb).split("/"))[(((sources[s].thumb).split("/")).length-1)];
        console.log(s, name);

        im.resize({
            srcData: fs.readFileSync('./thumbs/original/'+name, 'binary'),
            width:50,
            height:50
        }, function(err, stdout, stderr){
            if (err){ throw err; }
            fs.writeFileSync('./thumbs/small/'+name, stdout, 'binary');
            s++;
            if(s<sources.length){
                setTimeout(resize(), 10);
            }else{
                process.exit();
            }
        });
    }else{
        s++;
        if(s<sources.length){
            setTimeout(resize(), 10);
        }else{
            process.exit();
        }
    }
}

resize();
