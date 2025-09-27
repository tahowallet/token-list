#!/usr/bin/env node

/**
 * Semantic Versioning Tests for Token List
 *
 * Tests the determineVersionIncrement function to ensure it follows
 * the Uniswap token list semantic versioning standard:
 *
 * - Major: tokens removed, addresses/chainIds changed, files deleted
 * - Minor: tokens added, new files created
 * - Patch: token metadata changed (name, symbol, logoURI, decimals)
 * - No increment: JSON reordering, whitespace changes, etc.
 */

// Import the logic from the build script
function determineVersionIncrement(changes) {
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
        before.map((token) => [
          `${token.address}-${token.chainId || "undefined"}`,
          token,
        ]),
      )
      const afterMap = new Map(
        after.map((token) => [
          `${token.address}-${token.chainId || "undefined"}`,
          token,
        ]),
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

// Test cases
const testCases = [
  // MAJOR VERSION TESTS
  {
    name: "Token removal (major)",
    changes: [
      {
        file: "chains/1.json",
        type: "modified",
        before: [
          {
            address: "0x123",
            symbol: "TEST",
            name: "Test",
            decimals: 18,
            logoURI: "test.png",
          },
          {
            address: "0x456",
            symbol: "OLD",
            name: "Old Token",
            decimals: 18,
            logoURI: "old.png",
          },
        ],
        after: [
          {
            address: "0x123",
            symbol: "TEST",
            name: "Test",
            decimals: 18,
            logoURI: "test.png",
          },
        ],
      },
    ],
    expected: "major",
  },
  {
    name: "Address change (major - treated as remove + add)",
    changes: [
      {
        file: "chains/1.json",
        type: "modified",
        before: [
          {
            address: "0x123",
            symbol: "TEST",
            name: "Test",
            decimals: 18,
            logoURI: "test.png",
          },
        ],
        after: [
          {
            address: "0x456",
            symbol: "TEST",
            name: "Test",
            decimals: 18,
            logoURI: "test.png",
          },
        ],
      },
    ],
    expected: "major",
  },
  {
    name: "ChainId change (major - treated as remove + add)",
    changes: [
      {
        file: "chains/1.json",
        type: "modified",
        before: [
          {
            address: "0x123",
            chainId: 1,
            symbol: "TEST",
            name: "Test",
            decimals: 18,
            logoURI: "test.png",
          },
        ],
        after: [
          {
            address: "0x123",
            chainId: 137,
            symbol: "TEST",
            name: "Test",
            decimals: 18,
            logoURI: "test.png",
          },
        ],
      },
    ],
    expected: "major",
  },
  {
    name: "Deleted chain file (major)",
    changes: [
      {
        file: "chains/999.json",
        type: "deleted",
        before: [
          {
            address: "0x123",
            symbol: "TEST",
            name: "Test",
            decimals: 18,
            logoURI: "test.png",
          },
        ],
      },
    ],
    expected: "major",
  },

  // MINOR VERSION TESTS
  {
    name: "Token addition (minor)",
    changes: [
      {
        file: "chains/1.json",
        type: "modified",
        before: [
          {
            address: "0x123",
            symbol: "TEST",
            name: "Test",
            decimals: 18,
            logoURI: "test.png",
          },
        ],
        after: [
          {
            address: "0x123",
            symbol: "TEST",
            name: "Test",
            decimals: 18,
            logoURI: "test.png",
          },
          {
            address: "0x456",
            symbol: "NEW",
            name: "New Token",
            decimals: 18,
            logoURI: "new.png",
          },
        ],
      },
    ],
    expected: "minor",
  },
  {
    name: "New chain file (minor)",
    changes: [
      {
        file: "chains/999.json",
        type: "added",
        after: [
          {
            address: "0x123",
            symbol: "TEST",
            name: "Test",
            decimals: 18,
            logoURI: "test.png",
          },
        ],
      },
    ],
    expected: "minor",
  },

  // PATCH VERSION TESTS
  {
    name: "Name change (patch)",
    changes: [
      {
        file: "chains/1.json",
        type: "modified",
        before: [
          {
            address: "0x123",
            symbol: "TEST",
            name: "Test",
            decimals: 18,
            logoURI: "test.png",
          },
        ],
        after: [
          {
            address: "0x123",
            symbol: "TEST",
            name: "Test Updated",
            decimals: 18,
            logoURI: "test.png",
          },
        ],
      },
    ],
    expected: "patch",
  },
  {
    name: "Symbol change (patch)",
    changes: [
      {
        file: "chains/1.json",
        type: "modified",
        before: [
          {
            address: "0x123",
            symbol: "TEST",
            name: "Test",
            decimals: 18,
            logoURI: "test.png",
          },
        ],
        after: [
          {
            address: "0x123",
            symbol: "TST",
            name: "Test",
            decimals: 18,
            logoURI: "test.png",
          },
        ],
      },
    ],
    expected: "patch",
  },
  {
    name: "Logo URI change (patch)",
    changes: [
      {
        file: "chains/1.json",
        type: "modified",
        before: [
          {
            address: "0x123",
            symbol: "TEST",
            name: "Test",
            decimals: 18,
            logoURI: "old.png",
          },
        ],
        after: [
          {
            address: "0x123",
            symbol: "TEST",
            name: "Test",
            decimals: 18,
            logoURI: "new.png",
          },
        ],
      },
    ],
    expected: "patch",
  },
  {
    name: "Decimals change (patch)",
    changes: [
      {
        file: "chains/1.json",
        type: "modified",
        before: [
          {
            address: "0x123",
            symbol: "TEST",
            name: "Test",
            decimals: 18,
            logoURI: "test.png",
          },
        ],
        after: [
          {
            address: "0x123",
            symbol: "TEST",
            name: "Test",
            decimals: 6,
            logoURI: "test.png",
          },
        ],
      },
    ],
    expected: "patch",
  },

  // NO VERSION INCREMENT TESTS
  {
    name: "JSON reordering (no increment)",
    changes: [
      {
        file: "chains/1.json",
        type: "modified",
        before: [
          {
            address: "0x123",
            symbol: "FIRST",
            name: "First Token",
            decimals: 18,
            logoURI: "first.png",
          },
          {
            address: "0x456",
            symbol: "SECOND",
            name: "Second Token",
            decimals: 6,
            logoURI: "second.png",
          },
          {
            address: "0x789",
            symbol: "THIRD",
            name: "Third Token",
            decimals: 18,
            logoURI: "third.png",
          },
        ],
        after: [
          {
            address: "0x456",
            symbol: "SECOND",
            name: "Second Token",
            decimals: 6,
            logoURI: "second.png",
          },
          {
            address: "0x789",
            symbol: "THIRD",
            name: "Third Token",
            decimals: 18,
            logoURI: "third.png",
          },
          {
            address: "0x123",
            symbol: "FIRST",
            name: "First Token",
            decimals: 18,
            logoURI: "first.png",
          },
        ],
      },
    ],
    expected: null,
  },
  {
    name: "No changes (no increment)",
    changes: [
      {
        file: "chains/1.json",
        type: "modified",
        before: [
          {
            address: "0x123",
            symbol: "TEST",
            name: "Test",
            decimals: 18,
            logoURI: "test.png",
          },
        ],
        after: [
          {
            address: "0x123",
            symbol: "TEST",
            name: "Test",
            decimals: 18,
            logoURI: "test.png",
          },
        ],
      },
    ],
    expected: null,
  },

  // MIXED SCENARIOS (highest priority wins)
  {
    name: "Mixed changes - removal + addition (major wins)",
    changes: [
      {
        file: "chains/1.json",
        type: "modified",
        before: [
          {
            address: "0x123",
            symbol: "TEST",
            name: "Test",
            decimals: 18,
            logoURI: "test.png",
          },
          {
            address: "0x456",
            symbol: "OLD",
            name: "Old Token",
            decimals: 18,
            logoURI: "old.png",
          },
        ],
        after: [
          {
            address: "0x123",
            symbol: "TEST",
            name: "Test Updated",
            decimals: 18,
            logoURI: "test.png",
          },
          {
            address: "0x789",
            symbol: "NEW",
            name: "New Token",
            decimals: 18,
            logoURI: "new.png",
          },
        ],
      },
    ],
    expected: "major",
  },
  {
    name: "Mixed changes - addition + patch (minor wins)",
    changes: [
      {
        file: "chains/1.json",
        type: "modified",
        before: [
          {
            address: "0x123",
            symbol: "TEST",
            name: "Test",
            decimals: 18,
            logoURI: "test.png",
          },
        ],
        after: [
          {
            address: "0x123",
            symbol: "TEST",
            name: "Test Updated",
            decimals: 18,
            logoURI: "test.png",
          },
          {
            address: "0x456",
            symbol: "NEW",
            name: "New Token",
            decimals: 18,
            logoURI: "new.png",
          },
        ],
      },
    ],
    expected: "minor",
  },
]

// Run tests
console.log("🧪 Running Semantic Versioning Tests for Token List\n")

let passed = 0
let failed = 0

for (const test of testCases) {
  const result = determineVersionIncrement(test.changes)
  const success = result === test.expected

  console.log(`${success ? "✅" : "❌"} ${test.name}`)
  console.log(
    `   Expected: ${test.expected || "no increment"}, Got: ${result || "no increment"}`,
  )

  if (success) {
    passed++
  } else {
    failed++
    console.log(`   Changes:`, JSON.stringify(test.changes, null, 2))
  }
  console.log()
}

console.log(`📊 Results: ${passed} passed, ${failed} failed`)

if (failed > 0) {
  console.log(
    "\n❌ Some tests failed! Please fix the semantic versioning logic.",
  )
  process.exit(1)
} else {
  console.log("\n✅ All semantic versioning tests passed!")
  process.exit(0)
}
