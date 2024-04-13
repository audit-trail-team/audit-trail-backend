// Read failed audit logs from directory

require("dotenv").config();

const fs = require("fs").promises;
const path = require("path");

const failedDirectoryPath = process.env.FAILED_REQUESTS_DIRECTORY;
const successDirectoryPath = process.env.SUCCESS_REQUESTS_DIRECTORY;

async function readJsonFiles() {
  let dataArray = [];

  try {
    const files = await fs.readdir(failedDirectoryPath);
    for (let file of files) {
      if (path.extname(file) === ".json") {
        const data = await fs.readFile(
          path.join(failedDirectoryPath, file),
          "utf8"
        );
        json = {
          json: JSON.parse(data),
          file_name: file,
        };
        dataArray.push(json);
      }
    }
  } catch (err) {
    console.error("Error reading directory or file:", err);
    throw err; // Rethrow to allow caller to handle the error
  }

  return dataArray;
}

async function clearDirectory() {
  try {
    const files = await fs.readdir(failedDirectoryPath);
    for (let file of files) {
      const filePath = path.join(failedDirectoryPath, file);
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error("Failed to delete file:", err);
        } else {
          console.log(`Deleted file: ${filePath}`);
        }
      });
    }
  } catch (err) {
    console.error("Error reading directory or file:", err);
    throw err; // Rethrow to allow caller to handle the error
  }

  //   await fs.readdir(failedDirectoryPath, (err, files) => {
  //     if (err) {
  //       return console.error("Failed to list directory contents:", err);
  //     }

  //     console.log(files);
  //     files.forEach((file) => {
  //       const filePath = path.join(failedDirectoryPath, file);

  //       fs.unlink(filePath, (err) => {
  //         if (err) {
  //           console.error("Failed to delete file:", err);
  //         } else {
  //           console.log(`Deleted file: ${filePath}`);
  //         }
  //       });
  //     });
  //   });
}

async function writeFileToDirectory(fileName, content) {
  const filePath = path.join(successDirectoryPath, fileName);

  try {
    await fs.writeFile(filePath, content);
    console.log(`File written successfully to ${filePath}`);
  } catch (err) {
    console.error("Failed to write file:", err);
  }
}

module.exports = { readJsonFiles, clearDirectory, writeFileToDirectory };
