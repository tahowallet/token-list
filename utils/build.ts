#!/usr/bin/env npx ts-node

import { glob } from "glob"
import * as fs from "fs"
import * as path from "path"

import { schema } from "@uniswap/token-lists"
import Ajv from "ajv"
import addFormats from "ajv-formats"

const ajv = new Ajv({ allErrors: true, verbose: true })
addFormats(ajv)
const tokenlistValidator = ajv.compile(schema)

// sysexits(3) error codes
const EX_OK = 0
const EX_USAGE = 64
const EX_DATAERR = 65
const EX_NOINPUT = 66

// parse and validate all JSON in chains/*.json
glob("chains/*.json", {}, function (er, files) {
  // validate that the chain ID of each token matches the file name
  for (const f of files) {
    if (!f.match(/\d+\.json/)) {
      process.stderr.write(`Invalid token filename - ${f}`)
      process.exit(EX_DATAERR)
    }
  }

  // numeric sort
  const sorted: string[] = files.sort((f1, f2) => {
    const n1 = parseInt(f1.match(/chains\/(\d+)\.json$/)[1])
    const n2 = parseInt(f2.match(/chains\/(\d+)\.json$/)[1])

    if (n1 > n2) {
      return 1
    }

    if (n1 < n2) {
      return -1
    }

    return 0
  })

  let tokens: any[] = []

  // for each file, parse as JSON and validate tokens
  for (const f of sorted) {
    const chainId = parseInt(f.match(/chains\/(\d+)\.json$/)[1])

    const data = fs.readFileSync(path.resolve(__dirname, "./../", f))
    let parsed
    try {
      parsed = JSON.parse(data.toString())
    } catch (e) {
      process.stderr.write(`Invalid token file - ${f}`)
      process.exit(EX_DATAERR)
    }
    // validate that the chain ID of each token matches the file name
    for (const token of parsed) {
      if (token["chainId"] !== chainId) {
        process.stderr.write(`Invalid token in file, wrong chainId - ${f}`)
        process.exit(EX_DATAERR)
      }
      tokens.push(token)
    }
  }

  const tokenlistTemplate = JSON.parse(fs.readFileSync(path.resolve(__dirname, "./../", "base.tokenlist.json")).toString())

  fs.mkdirSync(path.resolve(__dirname, "../build/"), { recursive: true })

  const outputFilename = path.resolve(__dirname, "../build/", "tallycash.tokenlist.json")

  const newTokenList = {
    ...tokenlistTemplate,
    tokens
  }

  const valid = tokenlistValidator(newTokenList)

  if (!valid) {
    process.stderr.write("Invalid token list, errors below:\n")
    for (const e of tokenlistValidator.errors) {
      process.stderr.write(`${JSON.stringify(e, undefined, 2)}\n`)
    }
    process.exit(EX_DATAERR)
  }

  // TODO set timestamp
  // TODO set version as version in package.json
  fs.writeFileSync(outputFilename, JSON.stringify(newTokenList, undefined, 2))
})
