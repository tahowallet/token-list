# Token List Tests

This directory contains tests for the token list automation and semantic versioning logic.

## Test Files

### `semantic-versioning.test.js`
Tests the automatic semantic versioning logic that determines whether to increment major, minor, patch, or no version based on token changes.

**Test Coverage:**
- **Major version increments**: Token removals, address/chainId changes, file deletions
- **Minor version increments**: Token additions, new chain files  
- **Patch version increments**: Metadata changes (name, symbol, logoURI, decimals)
- **No version increments**: JSON reordering, formatting changes, no changes
- **Mixed scenarios**: Ensures highest priority change wins

## Running Tests

```bash
# Run all tests
yarn test

# Run tests with verbose output
yarn test:verbose

# Run specific test file
node tests/semantic-versioning.test.js
```

## CI/CD Integration

Tests are automatically run on:
- ✅ Every pull request 
- ✅ Every push to main branch
- ✅ Before building the token list

## Adding New Tests

When adding new semantic versioning logic or edge cases:

1. Add test cases to `semantic-versioning.test.js` in the `testCases` array
2. Include both the expected behavior and the input changes  
3. Test locally with `yarn test`
4. Ensure CI passes before merging

## Test Philosophy  

These tests ensure our automation correctly follows the [Uniswap Token List](https://github.com/Uniswap/token-lists) semantic versioning standard:

- **Major (X.0.0)**: Breaking changes that remove tokens or change addresses
- **Minor (X.Y.0)**: Additive changes that introduce new tokens
- **Patch (X.Y.Z)**: Metadata improvements that don't affect token identity
- **No increment**: Cosmetic changes that don't affect semantics