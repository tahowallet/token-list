# @tallycash/token-list

A community-maintained token list for Tally, the community-owned wallet.

The JSON schema represents the technical specification for a token list which can be used in a dApp interface, such as the Tally Cash wallet.

The schema is based upon the [uniswap token list implementation standard](https://github.com/Uniswap/token-lists)

## What are token lists?

Uniswap Token Lists is a specification for lists of token metadata (e.g. address, decimals, ...) that can be used by any dApp interfaces that needs one or more lists of tokens.

Anyone can create and maintain a token list, as long as they follow the specification.

Specifically an instance of a token list is a [JSON](https://www.json.org/json-en.html) blob that contains a list of 
[ERC20](https://github.com/ethereum/eips/issues/20) token metadata for use in dApp user interfaces.
Token list JSON must validate against the [JSON schema](https://json-schema.org/) in order to be used in the Uniswap Interface.
Tokens on token lists, and token lists themselves, are tagged so that users can easily find tokens.


## JSON Schema $id

The JSON schema ID is [https://uniswap.org/tokenlist.schema.json](https://uniswap.org/tokenlist.schema.json)

## Tally Cash Lists

Tally Cash aggregates the tokens that are reputable and vetoed by using some of the lists from well establised protocols like [Uniswap](https://uniswap.org/) , [Yearn](https://yearn.finance/), [Messari](https://messari.io/) and more.

The lists can be found [here](https://github.com/tallycash/extension/blob/main/background/services/preferences/defaults.ts)

The intention of the Tally Cash is list is to empower users to add tokens that the community cares about, are added to these lists slowly or that have bad metadata on other lists.

## Adding a token to Tally Cash token list

Tally is a community run DAO and welcomes contributions from anyone. If you would like to add tokens to this list, you may do the following steps:

1. Submit an issue [here](https://github.com/tallycash/token-list/issues) using the 'add a new token' issue template. 

* If you are confortable creating a Pull Request, you can follow through with step 2.
* If you do not want to create a Pull Request, please visit the Tally Ho [Discord](https://discord.gg/ATXWnvCA) and post in the #token-list-den channel letting the DAO know about your request.  

2. Fork this [repo](https://github.com/tallycash/token-list)

`git clone https://github.com/tallycash/token-list`

3. Verify the token is not already on the list

4. Create a branch add-[token you are adding]-token. 

` git checkout -b add-0xBitcoin-token `

5. Add the token/s to the desired chain in the chains folder eg 1.json for ethereum. A detailed list of chains is available [here](https://chainlist.org/). The below example shows the ease in adding `OxBitcoin token` to the list

```
    "tokens": [
      {
        "address": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        "chainId": 1,
        "name": "Wrapped Ether",
        "symbol": "WETH",
        "decimals": 18
      },
```


```
      {
        "address": "0xB6eD7644C69416d67B522e20bC294A9a9B405B31",
        "chainId": 1,
        "name": "0xBitcoin Token",
        "symbol": "0xBTC",
        "decimals": 8
      },
```


```
      {
        "address": "0xfC1E690f61EFd961294b3e1Ce3313fBD8aa4f85d",
        "chainId": 1,
        "name": "Aave Interest bearing DAI",
        "symbol": "aDAI",
        "decimals": 18
      }]
```
5. Commit with 'add-token' prepended to the commit message and a pull request to merge the changes into the tallycash/tokenlist repo
> All commits must be [signed](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits) using the `-S` flag to be merged into the main repo. 
```
git add .
git commit -S -m 'add-token - 0xBitcoin'
git push --set-upstream origin add-[token you are adding]-token
```
## Adding a token image

Although not mandatory, it is good to add a token image to have the appropriate logo appear in the Tally Cash wallet. 

The image should be in png format and should have 128 × 128 dimensions. The naming should be `<tokensymbol>.png` and a link to the image should be located in
the token schema that you are adding. Below is an example of adding LOOKS token.

```      {
        "address": "0xf4d2888d29d722226fafa5d9b24f9164c092421e",
        "chainId": 1,
        "name": "Looks Token",
        "symbol": "LOOKS",
        "decimals": 18,
        "logoURI" : "https://github.com/tallycash/token-list/images/looks.png"
      }
```