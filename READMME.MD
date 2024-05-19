A failed attempt at redeeming USDc from Solana using Portal.
The code fails at the simulation phase, with an error indicating a wrong instructions. (AFAIK, first time had to dig into Soalna).
Happend also in the Phatom wallet. Tried to run sendAndConfirmTransaction but got the same result:

```Simulation failed: { InstructionError: [ 0, { Custom: 0 } ] }
Logs: [
  'Program wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb invoke [1]',
  'Program log: Error: UnknownInstruction(211)',
  'Program wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb consumed 3531 of 200000 compute units',
  'Program wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb failed: custom program error: 0x0'
]```


# Running
Remove the `.exmaple` ending and fill transaction details.