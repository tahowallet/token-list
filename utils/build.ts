#!/usr/bin/env npx ts-node

import * as fs from "node:fs"
import * as path from "node:path"
import fleekStorage from "@fleekhq/fleek-storage-js"
import { schema } from "@uniswap/token-lists"
import Ajv from "ajv"
import addFormats from "ajv-formats"
import { glob } from "glob"

// Check if version increment is requested and get git changes
const shouldIncrementVersion = process.argv.includes("--increment-version")
const gitChangesArg = process.argv.find((arg) =>
  arg.startsWith("--git-changes="),
)
const gitChanges = gitChangesArg ? gitChangesArg.split("=")[1] : null

interface Token {
  address: string
  chainId?: number
  name: string
  symbol: string
  decimals: number
  logoURI?: string
}

interface TokenChange {
  file: string
  type: "added" | "modified" | "deleted"
  before?: Token[]
  after?: Token[]
}

function parseGitChanges(gitChangesString: string): TokenChange[] {
  if (!gitChangesString) return []

  try {
    return JSON.parse(Buffer.from(gitChangesString, "base64").toString("utf-8"))
  } catch (e) {
    console.warn("Failed to parse git changes:", e)
    return []
  }
}

function determineVersionIncrement(
  changes: TokenChange[],
): "major" | "minor" | "patch" | null {
  let hasMajorChange = false
  let hasMinorChange = false
  let hasPatchChange = false

  for (const change of changes) {
    if (change.type === "deleted") {
      // File deletion means tokens were removed
      hasMajorChange = true
    } else if (change.type === "added") {
      // New file means new tokens were added
      hasMinorChange = true
    } else if (change.type === "modified") {
      // Need to analyze what changed in the file
      const before = change.before || []
      const after = change.after || []

      // Create maps for easier comparison
      const beforeMap = new Map(
        before.map((token) => [`${token.address}-${token.chainId}`, token]),
      )
      const afterMap = new Map(
        after.map((token) => [`${token.address}-${token.chainId}`, token]),
      )

      // Check for removed tokens (major change)
      for (const [key] of beforeMap) {
        if (!afterMap.has(key)) {
          hasMajorChange = true
          break
        }
      }

      // Check for added tokens (minor change)
      for (const [key] of afterMap) {
        if (!beforeMap.has(key)) {
          hasMinorChange = true
        }
      }

      // Check for modified tokens (patch change)
      for (const [key, beforeToken] of beforeMap) {
        const afterToken = afterMap.get(key)
        if (afterToken) {
          // Check if address or chainId changed (major change - treated as remove + add)
          if (
            beforeToken.address !== afterToken.address ||
            beforeToken.chainId !== afterToken.chainId
          ) {
            hasMajorChange = true
            break
          }

          // Compare other token details (patch changes)
          const fieldsToCheck = ["name", "symbol", "logoURI", "decimals"]
          for (const field of fieldsToCheck) {
            if (beforeToken[field] !== afterToken[field]) {
              hasPatchChange = true
              break
            }
          }
        }
      }
    }
  }

  // Return highest priority change
  if (hasMajorChange) return "major"
  if (hasMinorChange) return "minor"
  if (hasPatchChange) return "patch"

  // Return null if no semantic changes detected
  return null
}

const ajv = new Ajv({ allErrors: true, verbose: true })
addFormats(ajv)
const tokenlistValidator = ajv.compile(schema)

// sysexits(3) error codes
const _EX_OK = 0
const _EX_USAGE = 64
const EX_DATAERR = 65
const _EX_NOINPUT = 66

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      FLEEK_STORAGE_API_KEY?: string
      FLEEK_STORAGE_API_SECRET?: string
    }
  }
}

// parse and validate all JSON in chains/*.json
glob("chains/*.json", {}, async (_er, files) => {
  // validate that the chain ID of each token matches the file name
  for (const f of files) {
    if (!f.match(/\d+\.json/)) {
      process.stderr.write(`Invalid token filename - ${f}`)
      process.exit(EX_DATAERR)
    }
  }

  // numeric sort
  const sorted: string[] = files.sort((f1, f2) => {
    const n1 = parseInt(f1.match(/chains\/(\d+)\.json$/)[1], 10)
    const n2 = parseInt(f2.match(/chains\/(\d+)\.json$/)[1], 10)

    if (n1 > n2) {
      return 1
    }

    if (n1 < n2) {
      return -1
    }

    return 0
  })

  let tokens: Token[] = []

  // for each file, parse as JSON and validate tokens
  for (const f of sorted) {
    const chainId = parseInt(f.match(/chains\/(\d+)\.json$/)[1], 10)

    const data = fs.readFileSync(path.resolve(__dirname, "./../", f))
    let parsed: Token[]
    try {
      parsed = JSON.parse(data.toString())
    } catch (_e) {
      process.stderr.write(`Invalid token file - ${f}`)
      process.exit(EX_DATAERR)
    }
    // validate that the chain ID of each token matches the file name
    for (const token of parsed) {
      if (!("address" in token)) {
        process.stderr.write(
          `Invalid token in file, no address - ${f} - ${token}`,
        )
        process.exit(EX_DATAERR)
      }

      tokens.push({
        ...token,
        chainId,
      })
    }
  }

  // if we can, upload all token images to IPFS and use that for the logoURIs
  if (
    process.env.FLEEK_STORAGE_API_KEY &&
    process.env.FLEEK_STORAGE_API_SECRET
  ) {
    process.stdout.write("Uploading token logos to IPFS...\n")
    tokens = await Promise.all(
      tokens.map(async (token) => {
        if (!token.logoURI) {
          return token
        }
        const localTokenPath = path.resolve(
          __dirname,
          "../chains",
          token.logoURI,
        )
        const uploadRequest = {
          apiKey: process.env.FLEEK_STORAGE_API_KEY,
          apiSecret: process.env.FLEEK_STORAGE_API_SECRET,
          key: `tokens/${token.chainId}/${token.address}`,
          data: fs.readFileSync(localTokenPath),
        }
        const result = await fleekStorage.upload(uploadRequest)

        process.stdout.write(`Uploaded ${token.symbol} to ${result.hash}\n`)

        return {
          ...token,
          logoURI: `ipfs://${result.hash}`,
        }
      }),
    )
  } else {
    // otherwise, use GitHub raw URLs
    process.stdout.write(
      "No Fleek credentials found, using GitHub URLs rather than IPFS...\n",
    )
    tokens = tokens.map((token) => ({
      ...token,
      logoURI: token.logoURI
        ? token.logoURI.replace(
            /^\.\./,
            "https://github.com/tallycash/token-list/raw/main",
          )
        : undefined,
    }))
  }

  const tokenlistTemplate = JSON.parse(
    fs
      .readFileSync(path.resolve(__dirname, "./../", "base.tokenlist.json"))
      .toString(),
  )

  // Handle version increment if requested
  let updatedTemplate = tokenlistTemplate
  if (shouldIncrementVersion) {
    // Parse git changes and determine version increment type
    const changes = parseGitChanges(gitChanges || "")
    const incrementType = determineVersionIncrement(changes)

    // If no semantic changes detected, skip version increment
    if (incrementType === null) {
      process.stdout.write(
        "No semantic changes detected in token files - skipping version increment\n",
      )
      updatedTemplate = tokenlistTemplate
    } else {
      // Calculate new version based on increment type
      let newVersion = { ...tokenlistTemplate.version }

      switch (incrementType) {
        case "major":
          newVersion = {
            major: tokenlistTemplate.version.major + 1,
            minor: 0,
            patch: 0,
          }
          process.stdout.write(
            `Major version increment (tokens removed/addresses changed): ${tokenlistTemplate.version.major}.${tokenlistTemplate.version.minor}.${tokenlistTemplate.version.patch} -> ${newVersion.major}.${newVersion.minor}.${newVersion.patch}\n`,
          )
          break
        case "minor":
          newVersion = {
            ...tokenlistTemplate.version,
            minor: tokenlistTemplate.version.minor + 1,
            patch: 0,
          }
          process.stdout.write(
            `Minor version increment (tokens added): ${tokenlistTemplate.version.major}.${tokenlistTemplate.version.minor}.${tokenlistTemplate.version.patch} -> ${newVersion.major}.${newVersion.minor}.${newVersion.patch}\n`,
          )
          break
        case "patch":
          newVersion = {
            ...tokenlistTemplate.version,
            patch: tokenlistTemplate.version.patch + 1,
          }
          process.stdout.write(
            `Patch version increment (token details changed): ${tokenlistTemplate.version.major}.${tokenlistTemplate.version.minor}.${tokenlistTemplate.version.patch} -> ${newVersion.major}.${newVersion.minor}.${newVersion.patch}\n`,
          )
          break
      }

      // Update timestamp to current time
      const currentTimestamp = new Date().toISOString()

      updatedTemplate = {
        ...tokenlistTemplate,
        version: newVersion,
        timestamp: currentTimestamp,
      }

      // Write updated template back to base.tokenlist.json
      fs.writeFileSync(
        path.resolve(__dirname, "./../", "base.tokenlist.json"),
        `${JSON.stringify(updatedTemplate, undefined, 2)}\n`,
      )

      // Also update package.json version to match
      const packageJsonPath = path.resolve(__dirname, "./../", "package.json")
      const packageJson = JSON.parse(
        fs.readFileSync(packageJsonPath).toString(),
      )
      packageJson.version = `${newVersion.major}.${newVersion.minor}.${newVersion.patch}`
      fs.writeFileSync(
        packageJsonPath,
        `${JSON.stringify(packageJson, undefined, 2)}\n`,
      )

      process.stdout.write(`Version updated to ${packageJson.version}\n`)
    }
  }

  fs.mkdirSync(path.resolve(__dirname, "../build/"), { recursive: true })

  const outputFilename = path.resolve(
    __dirname,
    "../build/",
    "tallycash.tokenlist.json",
  )

  const newTokenList = {
    ...updatedTemplate,
    tokens,
  }

  const valid = tokenlistValidator(newTokenList)

  if (!valid) {
    process.stderr.write("Invalid token list, errors below:\n")
    for (const e of tokenlistValidator.errors) {
      process.stderr.write(`${JSON.stringify(e, undefined, 2)}\n`)
    }
    process.exit(EX_DATAERR)
  }

  fs.writeFileSync(outputFilename, JSON.stringify(newTokenList, undefined, 2))

  // if we can, upload token list to IPFS
  if (
    process.env.FLEEK_STORAGE_API_KEY &&
    process.env.FLEEK_STORAGE_API_SECRET
  ) {
    process.stdout.write("Uploading token list to IPFS...\n")
    const uploadRequest = {
      apiKey: process.env.FLEEK_STORAGE_API_KEY,
      apiSecret: process.env.FLEEK_STORAGE_API_SECRET,
      key: `tallycash.tokenlist.json`,
      data: fs.readFileSync(outputFilename),
    }
    const result = await fleekStorage.upload(uploadRequest)

    process.stdout.write(`Uploaded list to ${result.hash}\n`)
  }
})
