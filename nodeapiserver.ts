import azureResource = require('azure-arm-resource');
import https = require('https');
import fs = require('fs');
import aciClient = require('azure-arm-containerinstance');
import url = require('url');

export async function start(aci: aciClient, resourceGroupName: string, port: number, keepRunning: () => boolean) {
    try {
        const options = {
            cert: fs.readFileSync('/app/node-cert.pem'),
            key: fs.readFileSync('/app/node-key.pem')
        }
        console.log('HTTPs api server starting at: %d', port);
        https.createServer(options, (req, res) => {
            console.log('Got request...');
            var errorMsg: string = '';
            if ('GET' === req.method) {
                var path = url.parse(req.url)['path'];
                var aciInfo = path.split('/', 5);
                console.log('Get logs:', aciInfo[1], aciInfo[2], aciInfo[3], aciInfo[4]);
                var cmd = aciInfo[1]; // The string starts with '/' so skip first empty string.
                if  (5 == aciInfo.length && 'containerLogs' === cmd) {
                    var namespace = aciInfo[2];
                    var pod = aciInfo[3];
                    var container = aciInfo[4];
                    aci.containerLogs.list(resourceGroupName, container, pod, function(err, result) {
                        if (err) {
                            console.log(err);
                            res.statusCode = 404;
                            res.end(err);
                        } else {
                            //console.log('Logs got\n', result['content']);
                            res.writeHead(200);
                            res.end(result['content']);
                        }

                    });
                } else {
                    if (aciInfo.length !=5) {
                        errorMsg = 'Wrong command length: ' + aciInfo.length;
                    } else {
                        errorMsg = 'Wrong command: ' + cmd;
                    }
                }
            } else {
                errorMsg = 'Received request: '+req.method;
            }

            if (errorMsg.length > 0) {
                console.log('Returning error:', errorMsg);
                // Return error for anything other than get.
                res.statusCode = 404;
                res.end(errorMsg);
            }
        }).listen(port);
        console.log('Started the server....');
    } catch (Exception) {
        console.log(Exception);
    }
};
