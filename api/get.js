import { fetchInfo } from "../main.js";

export default async function handler(request, response) {
  const { url, photosLimit } = request.query;
  
  if (!url) {
    response.status(403).json({ msg: "Error url is required" })
    return;
  }

  console.log({ url })
  
  const data = await fetchInfo(url, parseInt(photosLimit) || 10);
  response.status(200).json(data);
}