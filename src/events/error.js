const client = require("../index");

client.on("error", (error) => {
  console.log(error);
});

process.on("unhandledRejection", (error) => {
  console.log("Unhandled promise rejection:", error);
});

process.on("uncaughtException", console.error);
