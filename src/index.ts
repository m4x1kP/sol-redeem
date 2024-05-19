import bs58 from 'bs58';
import { Buffer } from 'buffer';
import keccak256 from 'keccak256';
import {
    Connection,
    PublicKey,
    Transaction,
    TransactionInstruction,
    Keypair,
    sendAndConfirmTransaction,
} from '@solana/web3.js';
import dotenv from 'dotenv';
import { VAA } from './vaa.js';

dotenv.config();

const {
    SOLANA_PRIVATE_KEY,
    CUSTOM_RPC_URL,
    TOKEN_BRIDGE_PROGRAM_ID,
    CORE_BRIDGE_PROGRAM_ID,
    BRIDGE_ACCOUNT,
    FEE_COLLECTOR_ACCOUNT,
    TOKEN_KEG_ACCOUNT,
    SYSVAR_RENT_ACCOUNT,
    SYSVAR_CLOCK_ACCOUNT,
    RECEIVER_TOKEN_ACCOUNT,
    RECEIVER_OWNER,
} = process.env;

if (!SOLANA_PRIVATE_KEY) {
    throw new Error('Missing SOLANA_PRIVATE_KEY in .env file');
}

const PAYER_SECRET_KEY = bs58.decode(SOLANA_PRIVATE_KEY);
const RECEIVER_TOKEN_ACCOUNT_PUBKEY = new PublicKey(RECEIVER_TOKEN_ACCOUNT!);
const RECEIVER_OWNER_PUBKEY = new PublicKey(RECEIVER_OWNER!);

// Function to derive the SEQUENCE_ACCOUNT PDA
const deriveSequenceAccount = (emitterKey: PublicKey, sequence: number): PublicKey => {
    const seeds: Buffer[] = [
        Buffer.from('Sequence'), 
        emitterKey.toBuffer(), 
        Buffer.from(sequence.toString())
    ];
    const [sequenceAccount] = PublicKey.findProgramAddressSync(seeds, new PublicKey(TOKEN_BRIDGE_PROGRAM_ID!));
    return sequenceAccount;
};

// Function to decode the VAA
const decodeVAA = (vaaBase64: string) => {
    const vaaBuffer = Buffer.from(vaaBase64, 'base64');
    const vaaHash = keccak256(vaaBuffer).toString('hex');
    return { vaaBuffer, vaaHash };
};

// Function to find the signature set account
const findSignatureSetAccount = async (vaaHash: string) => {
    const [signatureSetAccount] = await PublicKey.findProgramAddress(
        [Buffer.from('SignatureSet'), Buffer.from(vaaHash, 'hex')],
        new PublicKey(CORE_BRIDGE_PROGRAM_ID!)
    );
    return signatureSetAccount;
};

const simulateAndLogTransaction = async (connection: Connection, transaction: Transaction, signers: Keypair[]) => {
    try {
        const simulationResult = await connection.simulateTransaction(transaction, signers);
        if (simulationResult.value.err) {
            console.error('Simulation failed:', simulationResult.value.err);
            console.log('Logs:', simulationResult.value.logs);
        } else {
            console.log('Simulation succeeded:', simulationResult.value);
        }
    } catch (error) {
        console.error('Simulation error:', error);
    }
};

const redeemTokens = async () => {
    const connection = new Connection(CUSTOM_RPC_URL!);
    const payer = Keypair.fromSecretKey(PAYER_SECRET_KEY);

    // Decode VAA and derive the hash
    const { vaaBuffer, vaaHash } = decodeVAA(VAA.payload);

    console.log('Redeeming tokens with VAA');
    const SEQUENCE_ACCOUNT = deriveSequenceAccount(new PublicKey(BRIDGE_ACCOUNT!), Number(VAA.sequence));
    console.log('Sequence account:', SEQUENCE_ACCOUNT.toString());

    // Find the signature set account
    const SIGNATURE_SET_ACCOUNT = await findSignatureSetAccount(vaaHash);
    console.log('Signature set account:', SIGNATURE_SET_ACCOUNT.toString());

    const instructionKeys = [
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: RECEIVER_TOKEN_ACCOUNT_PUBKEY, isSigner: false, isWritable: true },
        { pubkey: RECEIVER_OWNER_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: new PublicKey(TOKEN_KEG_ACCOUNT!), isSigner: false, isWritable: false },
        { pubkey: new PublicKey(SYSVAR_RENT_ACCOUNT!), isSigner: false, isWritable: false },
        { pubkey: new PublicKey('11111111111111111111111111111111'), isSigner: false, isWritable: false },
        { pubkey: new PublicKey(SYSVAR_CLOCK_ACCOUNT!), isSigner: false, isWritable: false },
        { pubkey: new PublicKey(BRIDGE_ACCOUNT!), isSigner: false, isWritable: true },
        { pubkey: new PublicKey(FEE_COLLECTOR_ACCOUNT!), isSigner: false, isWritable: true },
        { pubkey: SEQUENCE_ACCOUNT, isSigner: false, isWritable: true },
        { pubkey: SIGNATURE_SET_ACCOUNT, isSigner: false, isWritable: true },
        { pubkey: new PublicKey(BRIDGE_ACCOUNT!), isSigner: false, isWritable: true },
    ];

    const instruction = new TransactionInstruction({
        keys: instructionKeys,
        programId: new PublicKey(TOKEN_BRIDGE_PROGRAM_ID!),
        data: vaaBuffer,
    });

    const transaction = new Transaction().add(instruction);
    await simulateAndLogTransaction(connection, transaction, [payer]);
};

redeemTokens();
