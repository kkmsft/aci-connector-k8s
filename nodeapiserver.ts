import azureResource = require('azure-arm-resource');
import https = require('https');
import fs = require('fs');
import aciClient = require('azure-arm-containerinstance');
import url = require('url');

export function start(aci: aciClient, resourceGroupName: string, port: number, keepRunning: () => boolean) {
    try {
        const options = {
            cert: fs.readFileSync('/app/node-cert.pem'),
            key: fs.readFileSync('/app/node-key.pem')
        }
        console.log('HTTPs api server starting at: %d', port);
        https.createServer(options, (req, res) => {
            console.log('Get logs - method:'+ req.method + ', url:' + req.url);
            var errorMsg: string = '';
            let statusCode = 404;
            if ('GET' === req.method) {
                var path = url.parse(req.url)['path'];
                var aciInfo = path.split('/', 5);
                var cmd = aciInfo[1]; // The string starts with '/' so skip first empty string
                if ('containerLogs' === cmd) {
                    if  (5 == aciInfo.length) {
                        var namespace = aciInfo[2];
                        var pod = aciInfo[3];
                        var container = aciInfo[4];
                        aci.containerLogs.list(resourceGroupName, container, pod, function(err, result) {
                            if (err) {
                                console.log(err);
                                res.statusCode = err['statusCode'];
                                res.end(err);
                            } else {
                                //Success !!
                                //console.log('Logs got\n', result['content']);
                                res.writeHead(200);
                                res.end(result['content']);
                            }
                        });
                    } else {
                        errorMsg = 'Wrong command length: ' + aciInfo.length;
                        statusCode = 400; //Bad request
                    }
                } else {
                    errorMsg = 'Wrong command: ' + cmd;
                    statusCode = 400; //Bad request
                }
            } else {
                errorMsg = 'Operation not supported: '+req.method;
                // Return error for anything other than GET.
                statusCode = 405; //Method not allowed.
            }

            if (errorMsg.length > 0) {
                console.log('Returning error:', errorMsg);
                res.statusCode = statusCode;
                res.end(errorMsg);
            }
        }).listen(port);
        console.log('Started the server....');
    } catch (Exception) {
        console.log(Exception);
    }
};
