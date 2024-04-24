//global includes
const http = require("http");

//local includes
const lib = require("./web3i");

//config files
const abiWrapper = require("./abi.json");

const {
  readJsonFiles,
  clearDirectory,
  writeFileToDirectory,
} = require("./read_failed_audit_logs");

// Crypto
const [encrypt, decrypt, sha256] = require("./encrypt_decrypt_hash");

// dotenv
require("dotenv").config();

// Global constants
const serverDomain = "127.0.0.1";
const serverPort = 3001;

// Global variables
let providerUrl = process.env.PROVIDER_URL;
let contractAddress = process.env.CONTRACT_ADDRESS;
let contractAbi = abiWrapper.abi;

function logWithTime(s) {
  console.log(new Date().toISOString(), "   ", s);
}

function serverError() {
  return {
    status: 500,
    message: "server error",
  };
}

function parseTimestamp(timestamp) {
  return new Date(timestamp + " UTC").getTime() / 1000; // return UTC timestamp in seconds from 'YYYY-MM-DD HH:MM::SS'
}

async function resolveBody(req, body) {
  jsonbody = JSON.parse(body);

  //Create the default JSON
  let json_response = {
    status: 404,
    message: "not found",
  };

  //I like using post even for gets because you can pass a json body to specify things about your get request
  if (
    req.method === "POST" &&
    req.url.endsWith("/get-audit-log-for-customer")
  ) {
    json_response = serverError();

    try {
      const customerName = jsonbody["customer_name"];
      logs = await lib.contr_getAuditLogs(
        providerUrl,
        contractAddress,
        contractAbi
      );
      cache_by_customer_name = {};
      for (i = 0; i < logs.length; i++) {
        logUsername = decrypt(logs[i][0], i);
        if (cache_by_customer_name[logUsername] === undefined) {
          cache_by_customer_name[logUsername] = [];
        }
        cache_by_customer_name[logUsername].push({
          username: logUsername,
          document_hash: logs[i][1],
          customer_name: logs[i][2],
          timestamp: logs[i][3],
          sig_type: logs[i][4],
        });
      }
      console.log("new cache by customer name " + cache_by_customer_name);

      if (cache_by_customer_name[customerName] !== undefined) {
        json_response = {
          status: 200,
          logs: cache_by_customer_name[customerName],
        };
      }
    } catch (err) {
      logWithTime(err);
    }
  } else if (req.method === "POST" && req.url.endsWith("/create-cached-audit-logs")) {
    json_response = serverError();
    try {
      if (
        jsonbody["EvidenceUserID"] === undefined ||
        jsonbody["PdfDocumentBase64"] === undefined ||
        jsonbody["Customer"] === undefined ||
        jsonbody["Timestamp"] === undefined ||
        jsonbody["SigType"] === undefined ||
        jsonbody["SigType"] < 0 ||
        jsonbody["SigType"] > 4
      ) {
        return {
          status: 400,
          message:
            "missing required fields or incorrect type: EvidenceUserID, PdfDocumentBase64, Customer, Timestamp, SigType",
        };
      }
      // get number of files in cache dir CACHE_REQUESTS_DIRECTORY
      // if 15 then we should create all audit logs including new one,
      // else write to file in cache reqeusts directory
      const storedJson = await readJsonFiles(process.env.CACHE_REQUESTS_DIRECTORY);
      if (storedJson.length >= 15) {
        let currentLogCount = Number(await lib.contr_getAuditLogsCount(
          providerUrl,
          contractAddress,
          contractAbi
        ));
        fieldUserIds = [];
        fieldDocumentHashes = [];
        fieldCustomers = [];
        fieldTimestamps = [];
        fieldSigTypes = [];

        // add cached logs
        for (const jsonData of storedJson) {
          console.log(jsonData)
          const auditLog = jsonData["json"]
          fieldUserIds.push(encrypt(auditLog["EvidenceUserID"], currentLogCount));
          fieldDocumentHashes.push(sha256(auditLog["PdfDocumentBase64"]));
          fieldCustomers.push(auditLog["Customer"]);
          fieldTimestamps.push(parseTimestamp(auditLog["Timestamp"]));
          fieldSigTypes.push(auditLog["SigType"]);
          currentLogCount += 1;
        }

        // add latest audit log
        fieldUserIds.push(encrypt(jsonbody["EvidenceUserID"], currentLogCount));
        fieldDocumentHashes.push(sha256(jsonbody["PdfDocumentBase64"]));
        fieldCustomers.push(jsonbody["Customer"]);
        fieldTimestamps.push(parseTimestamp(jsonbody["Timestamp"]));
        fieldSigTypes.push(jsonbody["SigType"]);
        currentLogCount += 1;


        fields = [
          fieldUserIds,
          fieldDocumentHashes,
          fieldCustomers,
          fieldTimestamps,
          fieldSigTypes,
        ];
        console.log("adding audit log")
        console.log(fields)
        const contractResponse = await lib.contr_addAuditLogs(
          providerUrl,
          contractAddress,
          contractAbi,
          fields //[["_userNameEncrypted"], ["_documentHash"], ["_customerName"], [_timeStamp], [_sigType]]
        );

        // remove all files from cache dir
        await clearDirectory(process.env.CACHE_REQUESTS_DIRECTORY);

        // write to success dir
        for (const jsonData of storedJson) {
          await writeFileToDirectory(
            jsonData["file_name"],
            JSON.stringify(jsonData["json"]),
            process.env.SUCCESS_REQUESTS_DIRECTORY
          );
        }

        json_response = {
          status: 200,
          message: "written all cached audit logs to blockchain."
        };

      } else {
        // write to cache dir
        file_name = `${Date.now()}-${jsonbody["Customer"]}.json`;
        await writeFileToDirectory(
          file_name,
          JSON.stringify(jsonbody),
          process.env.CACHE_REQUESTS_DIRECTORY
        );

        json_response = {
          status: 200,
          message: "cached audit logs, there are now " + (storedJson.length + 1) + " cached logs"
        };

      }
    } catch (err) {
      logWithTime(err);
    }
  } else if (req.method === "POST" && req.url.endsWith("/create-audit-log")) {
    json_response = serverError();
    try {
      if (
        jsonbody["EvidenceUserID"] === undefined ||
        jsonbody["PdfDocumentBase64"] === undefined ||
        jsonbody["Customer"] === undefined ||
        jsonbody["Timestamp"] === undefined ||
        jsonbody["SigType"] === undefined ||
        jsonbody["SigType"] < 0 ||
        jsonbody["SigType"] > 4
      ) {
        return {
          status: 400,
          message:
            "missing required fields or incorrect type: EvidenceUserID, PdfDocumentBase64, Customer, Timestamp, SigType",
        };
      }
      const currentLogCount = await lib.contr_getAuditLogsCount(
        providerUrl,
        contractAddress,
        contractAbi
      );

      fields = [
        encrypt(jsonbody["EvidenceUserID"], Number(currentLogCount)),
        sha256(jsonbody["PdfDocumentBase64"]),
        jsonbody["Customer"],
        jsonbody["Timestamp"].replaceAll('"', ''),
        jsonbody["SigType"],
      ];
      console.log("adding audit log")
      console.log(fields)
      const contractResponse = await lib.contr_addAuditLog(
        providerUrl,
        contractAddress,
        contractAbi,
        fields //["_userNameEncrypted", "_documentHash", _timeStamp, _sigType]
      );

      json_response = {
        status: 200,
        outcome: contractResponse,
      };
    } catch (err) {
      logWithTime(err);
    }
  } else if (req.method === "POST" && req.url.endsWith("/create-audit-logs")) {
    json_response = serverError();
    try {
      for (const auditLog of jsonbody["auditLogs"]) {
        if (
          jsonbody["EvidenceUserID"] === undefined ||
          jsonbody["PdfDocumentBase64"] === undefined ||
          jsonbody["Customer"] === undefined ||
          jsonbody["Timestamp"] === undefined ||
          jsonbody["SigType"] === undefined ||
          jsonbody["SigType"] < 0 ||
          jsonbody["SigType"] > 4
        ) {
          return {
            status: 400,
            message:
              "missing required fields or incorrect type: EvidenceUserID, PdfDocumentBase64, Customer, Timestamp, SigType",
          };
        }
      }
      let currentLogCount = await lib.contr_getAuditLogsCount(
        providerUrl,
        contractAddress,
        contractAbi
      );
      fieldUserIds = [];
      fieldDocumentHashes = [];
      fieldCustomers = [];
      fieldTimestamps = [];
      fieldSigTypes = [];
      for (const auditLog of jsonbody["auditLogs"]) {
        fieldUserIds.push(encrypt(auditLog["EvidenceUserID"], currentLogCount));
        fieldDocumentHashes.push(sha256(auditLog["PdfDocumentBase64"]));
        fieldCustomers.push(auditLog["Customer"]);
        fieldTimestamps.push(parseTimestamp(auditLog["Timestamp"]));
        fieldSigTypes.push(auditLog["SigType"]);
        currentLogCount += 1;
      }
      fields = [
        fieldUserIds,
        fieldDocumentHashes,
        fieldCustomers,
        fieldTimestamps,
        fieldSigTypes,
      ];
      console.log("adding audit log")
      console.log(fields)
      const contractResponse = await lib.contr_addAuditLog(
        providerUrl,
        contractAddress,
        contractAbi,
        fields //[["_userNameEncrypted"], ["_documentHash"], ["_customerName"], [_timeStamp], [_sigType]]
      );

      json_response = {
        status: 200,
        outcome: contractResponse,
      };
    } catch (err) {
      logWithTime(err);
    }
  } else if (req.method === "POST" && req.url.endsWith("/get-audit-log")) {
    json_response = serverError();

    try {
      let id = jsonbody["LogId"];
      const contractResponse = await lib.contr_getAuditLog(
        providerUrl,
        contractAddress,
        contractAbi,
        id
      );

      let response = {
        username: contractResponse[0],
        document_hash: contractResponse[1],
        customer_name: contractResponse[2],
        timestamp: contractResponse[3],
        sig_type: contractResponse[4],
      };

      console.log(contractResponse);

      json_response = {
        status: 200,
        log_entry: response,
      };
    } catch (err) {
      logWithTime(err);
    }
  }

  return json_response;
}

async function retryFailedAuditLogs() {
  try {
    const jsonData = await readJsonFiles(process.env.FAILED_REQUESTS_DIRECTORY);
    let currentLogCount = Number(
      await lib.contr_getAuditLogsCount(
        providerUrl,
        contractAddress,
        contractAbi
      )
    );

    for (const json of jsonData) {
      jsonbody = json["json"];
      fields = [
        encrypt(jsonbody["EvidenceUserID"], Number(currentLogCount)),
        sha256(jsonbody["PdfDocumentBase64"]),
        jsonbody["Customer"],
        parseTimestamp(jsonbody["Timestamp"]),
        jsonbody["SigType"],
      ];
      console.log(fields);
      const contractResponse = await lib.contr_addAuditLog(
        providerUrl,
        contractAddress,
        contractAbi,
        fields //["_userNameEncrypted", "_documentHash", _timeStamp, _sigType]
      );
      currentLogCount += 1;
    }

    // remove all files from failed dir
    await clearDirectory(process.env.FAILED_REQUESTS_DIRECTORY);

    // write to success dir
    for (const json of jsonData) {
      await writeFileToDirectory(
        json["file_name"],
        JSON.stringify(json["json"]),
        process.env.SUCCESS_REQUESTS_DIRECTORY
      );
    }
  } catch (error) {
    console.error("Failed to read JSON files:", error);
  }
}

retryFailedAuditLogs();

http
  .createServer(function (req, res) {
    logWithTime(`Server will listen at : ${serverDomain}:${serverPort}`);

    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", async () => {
      if (body == "") body = "{}";

      let json_response = await resolveBody(req, body);

      // CORS
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Credentials", true);
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
      );
      //change the MIME type to 'application/json'
      res.writeHead(200, { "Content-Type": "application/json" });
      logWithTime("Server Running");
      //serialize & explicitly convert BNs to string
      res.end(
        JSON.stringify(json_response, (_, v) =>
          typeof v === "bigint" ? v.toString() : v
        )
      );
    });
  })
  .listen(serverPort);
