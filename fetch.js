#!/usr/bin/env node
import { fetchInfo } from "./main.js";

console.log(
  JSON.stringify(
    await fetchInfo(process.argv[2], process.argv[3]),
    null,
    2
  )
)