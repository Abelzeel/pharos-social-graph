# detect-sybils

Detect wallets that look like they were created by the same entity
(Sybil / coordinated-funder patterns).

## When to use

User asks: "is this a Sybil ring?", "are these 30 wallets the same
person?", "flag suspicious funder patterns", "compliance check on
this grant recipient list".

## The heuristic

A "Sybil cluster" is **many wallets funded by the same small set of
"funder" wallets within a tight time window**, using the same token.

Specifically:

- A funder sent to ≥ `--min-cluster` (default 3) different wallets
- All transfers in the same token
- Within `--max-block-span` (default 1,000 blocks) of each other
- The funder is not a known DEX/CEX/bridge contract (in future work)

This is intentionally simple. A real Sybil ring will have
staggered timings, multiple funders, and mules — but a surprising
number of naive Sybils (one EOA → 50 wallets in one burst) get
caught by this rule.

## Reference command

```bash
node scripts/graph-sybils.js \
  --in output/graph.json \
  --min-cluster 3 \
  --top 50 \
  --out output/sybils.json
```

## Output

```json
{
  "stats": { "funderCount": 412, "suspectClusterCount": 3 },
  "threshold": { "minClusterSize": 3, "maxBlockSpan": 1000 },
  "suspects": [
    {
      "funder": "0xabcd…",
      "token": "0x...",
      "clusterSize": 12,
      "blockRange": [23850100, 23850999],
      "blockSpan": 899,
      "fundedWallets": [ "0x1111…", "0x2222…", ... ]
    }
  ]
}
```

## How to render in chat

```
[*] scanned 412 funders
[*] flagged 3 suspect clusters

  Top 5:
    funder=0xabcd…  cluster=12  token=0x…  span=899 blocks
    funder=0xbeef…  cluster=8   token=0x…  span=1200 blocks
```

## How the agent should phrase the result

> *"3 funder wallets look suspicious — each sent to 12+ other wallets
> in tight time windows. This is a Sybil pattern, but not proof: the
> funder could be an airdrop distributor, a multisig treasury, or a
> CEX hot wallet. Always check the funder's other activity before
> drawing conclusions."*

## Edge cases

- **Faucet wallets** — on testnet, the faucet is the #1 funder.
  Filter known faucets from the results using
  `assets/known-contracts.json` (TODO: integration).
- **Airdrop distributors** — same problem. A legitimate airdrop can
  look like a Sybil. Cross-reference against known projects.
- **CEX hot wallets** — a CEX batches deposits from many users.
  Same pattern. Add CEX addresses to the known-contracts allowlist.
- **Single huge funder, 1 recipient** — not a cluster. `--min-cluster`
  guards against this.

## Future work

- Filter out known good addresses (CEX, faucets, project treasuries)
- Multi-funder detection (cluster by INI graph, not just direct edges)
- Time-decay scoring
- Cross-reference with `pharos-approval-shield` to flag risky
  spenders in Sybil clusters
