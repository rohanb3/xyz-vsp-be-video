const https = require('https');
 
function getRequestSend (options){
    return new Promise((resolve, reject) => {
        let req = https.request(options, (res) =>
        {
            let output = '';
            //console.log('rest::', options.host + ':' + res.statusCode);
            res.setEncoding('utf8');

            res.on('data', function (chunk) {
                output += chunk;
            });

            res.on('end', () => {
                try {
                    let obj = JSON.parse(output);
                    // console.log('rest::', obj);
                    resolve({
                        statusCode: res.statusCode,
                        data: obj
                    });
                }
                catch(err) {
                    //console.error('rest::end', err);
                    reject(err);
                }
            });
        });

        req.on('error', (err) => {
            //console.error('rest::request', err);
            reject(err);
        });

        req.end();
    });
}

exports.getRequestSend = getRequestSend;