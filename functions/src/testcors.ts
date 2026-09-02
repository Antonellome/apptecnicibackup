
import { onRequest } from "firebase-functions/v2/https";

export const testcors = onRequest((request, response) => {
  // Set CORS headers for preflight requests
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (request.method === "OPTIONS") {
    // End preflight request successfully
    response.status(204).send("");
    return;
  }

  // For actual requests, just send a success message
  response.status(200).json({ message: "CORS test successful!" });
});
