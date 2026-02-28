"use client";

import { useMemo } from "react";
import {
  AnchorProvider,
  Program,
  type Idl,
} from "@coral-xyz/anchor";
import {
  useAnchorWallet,
  useConnection,
  type AnchorWallet,
} from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

import onchainIdl from "./onchain-idl.json";

export const ONCHAIN_PROGRAM_ID = new PublicKey(
  "3HfJzm3qJawEJJhrFFn8aYSVYS8qT2B4s5JviAAyE6MB",
);

const idl = onchainIdl as Idl;

export const getAnchorProvider = (
  connection: AnchorProvider["connection"],
  wallet: AnchorWallet,
) =>
  new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

export const getOnchainProgram = (
  connection: AnchorProvider["connection"],
  wallet: AnchorWallet,
) => {
  const provider = getAnchorProvider(connection, wallet);
  return new Program(idl, provider);
};

export const useOnchainProgram = () => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  return useMemo(() => {
    if (!wallet) {
      return null;
    }

    return getOnchainProgram(connection, wallet);
  }, [connection, wallet]);
};
