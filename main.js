//global includes
const http = require('http');

//local includes
const lib = require("./web3i");

//config files
const abiWrapper = require('./abi.json');

// Global constants
const serverDomain = "127.0.0.1"
const serverPort = 3000

// Global variables 
let providerUrl = "https://lb.drpc.org/ogrpc?network=arbitrum-sepolia&dkey=AuWOT9sRQkCyo5MpKudquNUTtpAu-OwR7pT-ngOF84-p"
let contractAddress = "0x36e6909E146E3c15d19c0A9A6fa6dDe649A96662"
let contractAbi = abiWrapper.abi

function logWithTime(s) {
    console.log(new Date().toISOString(), "   ", s)
}

function serverError() {
    return {
        status: 500,
        message: 'server error'
    }
}

async function resolveBody(req, body) {
    jsonbody = JSON.parse(body)

    //Create the default JSON
    let json_response = {
        status: 404,
        message: 'not found'
    }

    //I like using post even for gets because you can pass a json body to specify things about your get request
    if (req.method === "POST" && req.url.endsWith("/get-customer-name")) {
        json_response = serverError()

        try {
            const contractResponse = await lib.contr_getCustomerName(
                providerUrl,
                contractAddress,
                contractAbi
            )

            json_response = {
                status: 200,
                outcome: contractResponse
            }
        }
        catch (err) {
            logWithTime(err)
        }
    }

    else if (req.method === "POST" && req.url.endsWith("/create-audit-log")) {
        json_response = serverError()

        try {
            const contractResponse = await lib.contr_addAuditLog(
                providerUrl,
                contractAddress,
                contractAbi,
                jsonbody["parameters"]   //["_userNameEncrypted", "_documentHash", _timeStamp, _sigType]
            )

            json_response = {
                status: 200,
                outcome: contractResponse
            }
        }
        catch (err) {
            logWithTime(err)
        }
    }

    else if (req.method === "POST" && req.url.endsWith("/get-audit-log")) {
        json_response = serverError()

        try {
            const contractResponse = await lib.contr_getAuditLog(
                providerUrl,
                contractAddress,
                contractAbi,
                jsonbody["logId"]
            )

            console.log(contractResponse)

            json_response = {
                status: 200,
                log_entry: contractResponse
            }
        }
        catch (err) {
            logWithTime(err)
        }
    }

    else if (req.method === "POST" && req.url.endsWith("/change-address")) {
        json_response = serverError()

        try {
            contractAddress = jsonbody["address"]

            json_response = {
                status: 200,
            }
        }
        catch (err) {
            logWithTime(err)
        }
    }

    else if (req.method === "POST" && req.url.endsWith("/change-abi")) {
        json_response = serverError()

        try {
            contractAbi = jsonbody["abi"]

            json_response = {
                status: 200,
            }
        }
        catch (err) {
            logWithTime(err)
        }
    }

    return json_response
}


http.createServer(function (req, res) {
    logWithTime(`Server will listen at : ${serverDomain}:${serverPort}`);

    let body = '';
    req.on('data', (chunk) => {
        body += chunk;
    });
    req.on('end', async () => {
        if (body == '')
            body = '{}'

        let json_response = await resolveBody(req, body)

        // CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        //change the MIME type to 'application/json' 
        res.writeHead(200, { 'Content-Type': 'application/json' });
        logWithTime('Server Running');
        //serialize & explicitly convert BNs to string
        res.end(JSON.stringify(json_response, (_, v) => typeof v === 'bigint' ? v.toString() : v));
    });

}).listen(serverPort);

